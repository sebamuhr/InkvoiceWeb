<?php
// Shared by ping.php and stats.php. Not meant to be opened directly.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'stats-lib.php') { http_response_code(404); exit; }

const STATS_TZ = 'Europe/Berlin';

/**
 * Where the event files live. Preferred: a folder NEXT TO public_html (not reachable from the
 * web, untouched by app redeploys). On Hostinger that is .../domains/inkvoiceapp.com/inkvoice-stats.
 * Fallback: ./stats-data inside the app folder, locked down with its own .htaccess.
 */
function stats_dir(): ?string {
  $outside = dirname(__DIR__, 2) . '/inkvoice-stats';
  if (is_dir($outside) || @mkdir($outside, 0750, true)) {
    if (is_writable($outside)) return $outside;
  }
  $inside = __DIR__ . '/stats-data';
  if (!is_dir($inside) && !@mkdir($inside, 0750, true)) return null;
  if (!file_exists($inside . '/.htaccess')) @file_put_contents($inside . '/.htaccess', "Require all denied\nDeny from all\n");
  if (!file_exists($inside . '/index.html')) @file_put_contents($inside . '/index.html', '');
  return is_writable($inside) ? $inside : null;
}
