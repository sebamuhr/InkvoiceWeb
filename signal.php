<?php
/**
 * Inkvoice — WebRTC signaling mailbox.
 *
 * This is the ONLY server-side piece of Inkvoice, and it never sees a single
 * invoice. Two devices that both hold the same 6-digit code use it to exchange
 * the ~1KB WebRTC handshake (SDP offer/answer + ICE candidates). Once they've
 * shaken hands they talk peer-to-peer over the local WiFi and this file is out
 * of the loop — all real data stays on the devices.
 *
 * Design constraints (Hostinger / LiteSpeed shared PHP 8.3):
 *  - POLL-BASED, short requests only (no long-held connections) so per-request
 *    execution limits never bite. Clients re-ask every ~1s.
 *  - No database: state is small JSON files in a temp dir with a short TTL.
 *  - Permissive CORS so both app.inkvoiceapp.com (Hostinger) and app.elorate.net
 *    (GitHub Pages) can call it cross-origin.
 *
 * Protocol (all responses are JSON):
 *   POST ?a=offer&code=NNNNNN   body=<sdp>     host publishes its offer (creates the room)
 *   GET  ?a=offer&code=NNNNNN                  guest claims the offer (one-time; marks room claimed)
 *   POST ?a=answer&code=NNNNNN  body=<sdp>     guest publishes its answer
 *   GET  ?a=answer&code=NNNNNN                 host polls for the answer
 *   POST ?a=ice&code=NNNNNN&from=host|guest body=<candidate-json>   append a trickle-ICE candidate
 *   GET  ?a=ice&code=NNNNNN&from=host|guest&since=N   fetch the OTHER side's candidates after index N
 *   POST ?a=close&code=NNNNNN                  delete the room
 *
 * Nothing here is authenticated beyond knowing the code; the app layers a phone
 * "Accept this device?" prompt on top before any data is shared.
 */

// ---------- CORS ----------
$allowed = [
  'https://app.inkvoiceapp.com',
  'https://inkvoiceapp.com',
  'https://app.elorate.net',
  'http://localhost:8000',
  'http://localhost:8123',
  'http://127.0.0.1:8000',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed, true)) {
  header("Access-Control-Allow-Origin: $origin");
  header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

// ---------- helpers ----------
function fail(int $code, string $msg) { http_response_code($code); echo json_encode(['error' => $msg]); exit; }
function ok(array $data = []) { echo json_encode(['ok' => true] + $data); exit; }

const TTL = 180;            // rooms live 3 minutes, then vanish
const MAX_BLOB = 65536;     // 64KB cap on any single SDP/ICE body
const MAX_ICE = 60;         // cap candidates per side

$dir = sys_get_temp_dir() . '/inkvoice_signal';
if (!is_dir($dir)) @mkdir($dir, 0700, true);

// Opportunistic sweep of expired rooms (cheap; runs ~10% of requests).
if (mt_rand(1, 10) === 1) {
  foreach (glob("$dir/room_*.json") ?: [] as $f) {
    if (time() - @filemtime($f) > TTL) @unlink($f);
  }
}

// ---------- rate limit (per IP, coarse) ----------
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$rlFile = "$dir/rl_" . md5($ip) . '.txt';
$now = time();
$hits = [];
if (is_file($rlFile)) {
  $hits = array_filter(explode(',', (string)@file_get_contents($rlFile)), fn($t) => $t !== '' && ($now - (int)$t) < 60);
}
if (count($hits) > 120) fail(429, 'slow down');   // >120 req/min from one IP
$hits[] = $now;
@file_put_contents($rlFile, implode(',', $hits), LOCK_EX);

// ---------- validate inputs ----------
$action = $_GET['a'] ?? '';
// 6-digit code for first pairing, or a long device key for auto-reconnect.
$code = preg_replace('/[^a-zA-Z0-9]/', '', $_GET['code'] ?? '');
if (strlen($code) < 6 || strlen($code) > 64) fail(400, 'bad code');
$roomFile = "$dir/room_" . $code . '.json';

function loadRoom(string $roomFile): ?array {
  if (!is_file($roomFile)) return null;
  if (time() - @filemtime($roomFile) > TTL) { @unlink($roomFile); return null; }
  $r = json_decode((string)@file_get_contents($roomFile), true);
  return is_array($r) ? $r : null;
}
function saveRoom(string $roomFile, array $room): void {
  @file_put_contents($roomFile, json_encode($room), LOCK_EX);
}
function body(): string {
  $b = file_get_contents('php://input');
  if (strlen($b) > MAX_BLOB) fail(413, 'too large');
  return $b;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($action) {
  // ----- host publishes offer, creating the room -----
  case 'offer':
    if ($method === 'POST') {
      // Block only if a pairing is already IN PROGRESS under this code (claimed).
      // An unclaimed offer may be overwritten — this lets a phone refresh its own
      // standing "reconnect" advertisement under its device key.
      $existing = loadRoom($roomFile);
      if ($existing && $existing['claimed']) fail(409, 'code in use');
      saveRoom($roomFile, [
        'offer' => body(), 'answer' => null, 'claimed' => false,
        'ice' => ['host' => [], 'guest' => []], 'created' => time(),
      ]);
      ok();
    } else { // GET — guest claims the offer (one-time)
      $room = loadRoom($roomFile);
      if (!$room) fail(404, 'no such code');
      if ($room['claimed']) fail(410, 'already claimed');
      $room['claimed'] = true;
      saveRoom($roomFile, $room);
      ok(['offer' => $room['offer']]);
    }

  // ----- guest publishes answer / host polls for it -----
  case 'answer':
    $room = loadRoom($roomFile);
    if (!$room) fail(404, 'no such code');
    if ($method === 'POST') {
      $room['answer'] = body();
      saveRoom($roomFile, $room);
      ok();
    } else {
      ok(['answer' => $room['answer']]); // null until the guest posts it
    }

  // ----- trickle ICE candidates -----
  case 'ice':
    $from = ($_GET['from'] ?? '') === 'guest' ? 'guest' : 'host';
    $room = loadRoom($roomFile);
    if (!$room) fail(404, 'no such code');
    if ($method === 'POST') {
      if (count($room['ice'][$from]) < MAX_ICE) {
        $room['ice'][$from][] = body();
        saveRoom($roomFile, $room);
      }
      ok();
    } else {
      // Return the OTHER side's candidates newer than `since`.
      $other = $from === 'host' ? 'guest' : 'host';
      $since = max(0, (int)($_GET['since'] ?? 0));
      $list = array_slice($room['ice'][$other], $since);
      ok(['ice' => $list, 'next' => $since + count($list)]);
    }

  // ----- teardown -----
  case 'close':
    @unlink($roomFile);
    ok();

  default:
    fail(400, 'unknown action');
}
