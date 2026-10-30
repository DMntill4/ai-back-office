$path = "packages/web/src/components/views/HitlApprovalsView.tsx"
$full = (Resolve-Path $path).Path
$text = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)
$lines = $text -split "`r?`n"

# Localizar el bloque INITIAL_PROPOSALS y su cierre "];"
$start = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^const INITIAL_PROPOSALS') { $start = $i; break }
}
if ($start -lt 0) { Write-Output "NOT_FOUND"; exit 1 }

$end = -1
for ($i = $start; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\];\s*$') { $end = $i; break }
}
if ($end -lt 0) { Write-Output "END_NOT_FOUND"; exit 1 }

$out = @()
if ($start -gt 0) { $out += $lines[0..($start - 1)] }
if ($end + 1 -lt $lines.Count) { $out += $lines[($end + 1)..($lines.Count - 1)] }

$result = ($out -join "`r`n")
[System.IO.File]::WriteAllText($full, $result, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("REMOVED lines " + ($start + 1) + "-" + ($end + 1) + "; new total " + $out.Count)
