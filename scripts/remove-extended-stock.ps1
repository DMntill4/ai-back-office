$path = 'packages/web/src/components/views/StockInventoryView.tsx'
$full = (Resolve-Path $path).Path
$text = [System.IO.File]::ReadAllText($full)
$lines = $text -split "`r?`n"

$start = -1
$end = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($start -lt 0 -and $lines[$i] -match '^const EXTENDED_STOCK_DATA') {
        $start = $i
        continue
    }
    if ($start -ge 0 -and $lines[$i] -match '^\];\s*$') {
        $end = $i
        break
    }
}

if ($start -lt 0 -or $end -lt 0) {
    Write-Output "NOT FOUND start=$start end=$end"
    exit 1
}

$result = @()
if ($start -gt 0) { $result += $lines[0..($start - 1)] }
if ($end + 1 -lt $lines.Count) { $result += $lines[($end + 1)..($lines.Count - 1)] }

$out = ($result -join "`r`n")
[System.IO.File]::WriteAllText($full, $out, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "REMOVED lines $($start + 1)-$($end + 1); new total $($result.Count)"
