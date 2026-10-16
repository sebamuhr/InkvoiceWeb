<?php
/**
 * Inkvoice — anonymous usage counter.
 *
 * The installed app POSTs a tiny JSON event here:
 *   - "install" once per device (the first time it runs installed, or — for devices installed
 *     before this counter existed — the first time they open v71+, flagged prev=1);
 *   - "open" at most once per calendar day per device (→ daily/weekly/monthly active devices).
 *
 * What is stored, one JSON line per event: server date/time, event, a RANDOM device id the app
 * generated itself (not derived from anything about the person or phone), platform
 * (ios/android/other), app language, app version. NO IP address, no user agent, no invoice data.
 *
 * Storage: monthly files events-YYYY-MM.jsonl, kept OUTSIDE public_html when possible (so the
 * data survives redeploys and can never be downloaded), else in ./stats-data (web-denied).
 * Read them with stats.php.
 */
require __DIR__ . '/stats-lib.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }

$raw = file_get_contents('php://input', false, null, 0, 2048);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) { http_response_code(400); echo '{"ok":false}'; exit; }

// Strict whitelist validation — anything unexpected is rejected, never stored.
$ev   = $in['ev']   ?? '';
$id   = $in['id']   ?? '';
$os   = $in['os']   ?? 'other';
$lang = $in['lang'] ?? '';
$v    = $in['v']    ?? '';
$prev = !empty($in['prev']) ? 1 : 0;
if (!in_array($ev, ['install', 'open'], true)
    || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $id)
    || !in_array($os, ['ios', 'android', 'other'], true)
    || !preg_match('/^v\d{1,4}$/', $v)) {
  http_response_code(400); echo '{"ok":false}'; exit;
}
if (!preg_match('/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/', $lang)) $lang = '';

$dir = stats_dir();
if ($dir === null) { http_response_code(500); echo '{"ok":false}'; exit; }

$now = new DateTime('now', new DateTimeZone(STATS_TZ));
$line = json_encode([
  't' => $now->format('Y-m-d H:i:s'), 'ev' => $ev, 'id' => $id, 'os' => $os,
  'lang' => $lang, 'v' => $v, 'prev' => $prev,
]) . "\n";

$ok = file_put_contents($dir . '/events-' . $now->format('Y-m') . '.jsonl', $line, FILE_APPEND | LOCK_EX);
if ($ok === false) { http_response_code(500); echo '{"ok":false}'; exit; }
echo '{"ok":true}';
