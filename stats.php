<?php
/**
 * Inkvoice — private usage stats. Open: stats.php?k=<STATS_KEY from stats-config.php>
 * Reads the anonymous events written by ping.php. Add &csv=1 for a per-day CSV download.
 */
require __DIR__ . '/stats-lib.php';
$cfg = __DIR__ . '/stats-config.php';
if (!file_exists($cfg)) { http_response_code(404); exit; }
require $cfg;
if (!defined('STATS_KEY') || !hash_equals(STATS_KEY, (string)($_GET['k'] ?? ''))) { http_response_code(404); exit; }

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
$tz = new DateTimeZone(STATS_TZ);

// ---- Load every event (both possible storage folders, all months). ----
$dirs = array_unique(array_filter([dirname(__DIR__, 2) . '/inkvoice-stats', __DIR__ . '/stats-data'], 'is_dir'));
$events = [];
foreach ($dirs as $d) {
  foreach (glob($d . '/events-*.jsonl') ?: [] as $f) {
    foreach (file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $l) {
      $e = json_decode($l, true);
      if (is_array($e) && isset($e['t'], $e['id'])) $events[] = $e;
    }
  }
}
usort($events, fn($a, $b) => strcmp($a['t'], $b['t']));

// ---- Per device: first seen, whether it predates the counter, latest platform/version. ----
$dev = [];            // id => [first, prev, os, v, lang, last]
$activeByDay = [];    // Y-m-d => [id => true]
foreach ($events as $e) {
  $day = substr($e['t'], 0, 10);
  $id = $e['id'];
  if (!isset($dev[$id])) $dev[$id] = ['first' => $day, 'prev' => (int)($e['prev'] ?? 0)];
  // An explicit install event decides prev, even if an open arrived first.
  if (($e['ev'] ?? '') === 'install') $dev[$id]['prev'] = (int)($e['prev'] ?? 0);
  $dev[$id]['os'] = $e['os'] ?? 'other';
  $dev[$id]['v'] = $e['v'] ?? '';
  $dev[$id]['lang'] = strtolower(substr($e['lang'] ?? '', 0, 2)) ?: '?';
  $dev[$id]['last'] = $day;
  $activeByDay[$day][$id] = true;
}

$newByDay = [];       // Y-m-d => new installs (installed after the counter existed)
$prevByDay = [];      // Y-m-d => existing devices first seen that day
foreach ($dev as $d) {
  if ($d['prev']) $prevByDay[$d['first']] = ($prevByDay[$d['first']] ?? 0) + 1;
  else $newByDay[$d['first']] = ($newByDay[$d['first']] ?? 0) + 1;
}

$today = new DateTime('today', $tz);
$dayStr = fn(int $back) => (clone $today)->modify("-$back day")->format('Y-m-d');
$activeSince = function (int $days) use ($activeByDay, $dayStr) {
  $from = $dayStr($days - 1); $ids = [];
  foreach ($activeByDay as $day => $set) if ($day >= $from) $ids += $set;
  return count($ids);
};

$total = count($dev);
$totalNew = array_sum($newByDay);
$totalPrev = array_sum($prevByDay);
$count = function (string $field, ?string $minLast = null) use ($dev) {
  $c = [];
  foreach ($dev as $d) { if ($minLast && $d['last'] < $minLast) continue; $k = $d[$field] ?: '?'; $c[$k] = ($c[$k] ?? 0) + 1; }
  arsort($c); return $c;
};

// ---- Per-day rows: every day from the first event to today. ----
$rows = [];
if ($events) {
  $cur = new DateTime(substr($events[0]['t'], 0, 10), $tz);
  $cum = 0;
  while ($cur <= $today) {
    $d = $cur->format('Y-m-d');
    $n = $newByDay[$d] ?? 0; $p = $prevByDay[$d] ?? 0; $cum += $n + $p;
    $rows[] = [$d, $n, $p, count($activeByDay[$d] ?? []), $cum];
    $cur->modify('+1 day');
  }
}

if (!empty($_GET['csv'])) {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="inkvoice-stats-' . $today->format('Y-m-d') . '.csv"');
  echo "date,new_installs,existing_first_seen,active_devices,total_devices\n";
  foreach ($rows as $r) echo implode(',', $r) . "\n";
  exit;
}

// ---- Per-month rows. ----
$months = [];
foreach ($rows as [$d, $n, $p]) { $m = substr($d, 0, 7); $months[$m][0] = ($months[$m][0] ?? 0) + $n; $months[$m][1] = ($months[$m][1] ?? 0) + $p; }
foreach ($activeByDay as $d => $set) { $m = substr($d, 0, 7); $months[$m][2] = ($months[$m][2] ?? []) + $set; }
krsort($months);

$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$k = $h($_GET['k']);
$osName = ['ios' => 'iPhone / iPad', 'android' => 'Android', 'other' => 'Other'];
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Inkvoice stats</title>
<style>
:root{--bg:#f6f7fb;--card:#fff;--ink:#1d2433;--muted:#6b7385;--line:#e4e7ef;--accent:#069a8b}
@media (prefers-color-scheme: dark){:root{--bg:#12151c;--card:#1b1f29;--ink:#e8ebf2;--muted:#98a0b3;--line:#2b3140;--accent:#2cc2b1}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,sans-serif}
main{max-width:860px;margin:0 auto;padding:20px 16px 48px}
h1{font-size:22px;margin:0 0 2px}.sub{color:var(--muted);font-size:13px;margin-bottom:18px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:18px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.tile b{display:block;font-size:26px;font-variant-numeric:tabular-nums}.tile span{color:var(--muted);font-size:12.5px}
section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:14px;overflow-x:auto}
h2{font-size:15px;margin:0 0 8px}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{text-align:right;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}th:first-child,td:first-child{text-align:left}
th{color:var(--muted);font-weight:600;font-size:12.5px}tr.zero td{color:var(--muted)}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.two section{margin:0}
a{color:var(--accent)}.note{color:var(--muted);font-size:12.5px}
</style></head><body><main>
<h1>Inkvoice — usage</h1>
<div class="sub">Installed web app (inkvoiceapp.com/app) · anonymous counter · <?= $h($today->format('Y-m-d')) ?> (<?= $h(STATS_TZ) ?>)</div>

<div class="tiles">
  <div class="tile"><b><?= $total ?></b><span>devices in total</span></div>
  <div class="tile"><b><?= $totalNew ?></b><span>new installs since tracking</span></div>
  <div class="tile"><b><?= $totalPrev ?></b><span>installed before tracking (seen since)</span></div>
  <div class="tile"><b><?= $activeSince(1) ?></b><span>active today</span></div>
  <div class="tile"><b><?= $activeSince(7) ?></b><span>active last 7 days</span></div>
  <div class="tile"><b><?= $activeSince(30) ?></b><span>active last 30 days</span></div>
</div>

<section><h2>By month</h2><table>
<tr><th>Month</th><th>New</th><th>Existing*</th><th>Active</th></tr>
<?php foreach ($months as $m => $v): ?>
<tr><td><?= $h($m) ?></td><td><?= $v[0] ?? 0 ?></td><td><?= $v[1] ?? 0 ?></td><td><?= count($v[2] ?? []) ?></td></tr>
<?php endforeach; if (!$months): ?><tr><td colspan="4">No data yet.</td></tr><?php endif; ?>
</table></section>

<div class="two">
  <section><h2>Platform</h2><table><tr><th>All devices</th><th>Count</th></tr>
  <?php foreach ($count('os') as $o => $c): ?><tr><td><?= $h($osName[$o] ?? $o) ?></td><td><?= $c ?></td></tr><?php endforeach; ?>
  </table></section>
  <section><h2>App language</h2><table><tr><th>All devices</th><th>Count</th></tr>
  <?php foreach ($count('lang') as $o => $c): ?><tr><td><?= $h($o) ?></td><td><?= $c ?></td></tr><?php endforeach; ?>
  </table></section>
  <section><h2>Version (active 30 days)</h2><table><tr><th>Version</th><th>Devices</th></tr>
  <?php foreach ($count('v', $dayStr(29)) as $o => $c): ?><tr><td><?= $h($o) ?></td><td><?= $c ?></td></tr><?php endforeach; ?>
  </table></section>
</div>

<section style="margin-top:14px"><h2>By day <a href="?k=<?= $k ?>&amp;csv=1" style="font-weight:400;font-size:13px;margin-left:8px">Download CSV</a></h2><table>
<tr><th>Date</th><th>New</th><th>Existing*</th><th>Active</th><th>Total</th></tr>
<?php foreach (array_reverse($rows) as [$d, $n, $p, $a, $cum]): ?>
<tr class="<?= ($n + $p + $a) ? '' : 'zero' ?>"><td><?= $h($d) ?></td><td><?= $n ?></td><td><?= $p ?></td><td><?= $a ?></td><td><?= $cum ?></td></tr>
<?php endforeach; if (!$rows): ?><tr><td colspan="5">No data yet.</td></tr><?php endif; ?>
</table></section>

<p class="note">“New” = devices that installed the app after tracking started (v71). “Existing*” = installed before tracking:
devices that already had the app and were first counted when they opened v71 or later — they show up gradually as
people open the app. A device that deletes and reinstalls the app counts as a new device. Nothing personal is stored:
no IP, no invoice data — only a random device id, platform, language and version.</p>
</main></body></html>
