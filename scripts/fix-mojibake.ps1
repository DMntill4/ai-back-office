param([string]$Path)

$c = Get-Content -LiteralPath $Path -Raw -Encoding UTF8

$pairs = @(
    @([char]0x00C3 + [char]0x00B1, [char]0x00F1), # Ã± -> ñ
    @([char]0x00C3 + [char]0x00B3, [char]0x00F3), # Ã³ -> ó
    @([char]0x00C3 + [char]0x00A1, [char]0x00E1), # Ã¡ -> á
    @([char]0x00C3 + [char]0x00A9, [char]0x00E9), # Ã© -> é
    @([char]0x00C3 + [char]0x00AD, [char]0x00ED), # Ã­ -> í
    @([char]0x00C3 + [char]0x00BA, [char]0x00FA), # Ãº -> ú
    @([char]0x00C3 + [char]0x0081, [char]0x00C1), # Ã + ctrl -> Á
    @([char]0x00C3 + [char]0x0089, [char]0x00C9), # Ã + ctrl -> É
    @([char]0x00C3 + [char]0x0093, [char]0x00D3), # Ã + ctrl -> Ó
    @([char]0x00C3 + [char]0x009A, [char]0x00DA), # Ã + ctrl -> Ú
    @([char]0x00C3 + [char]0x0091, [char]0x00D1), # Ã + ctrl -> Ñ
    @([char]0x00C2 + [char]0x00B7, [char]0x00B7), # Â· -> ·
    @([char]0x00E2 + [char]0x20AC + [char]0x201D, [char]0x2014), # â€” -> —
    @([char]0x00E2 + [char]0x20AC + [char]0x201C, [char]0x2013), # â€“ -> –
    @([char]0x00E2 + [char]0x20AC + [char]0x0153, [char]0x201C), # â€œ -> “
    @([char]0x00E2 + [char]0x20AC + [char]0x009D, [char]0x201D), # â€ + ctrl -> ”
    @([char]0x00E2 + [char]0x20AC + [char]0x00A6, [char]0x2026)  # â€¦ -> …
)

foreach ($p in $pairs) {
    $c = $c.Replace($p[0], $p[1])
}

[System.IO.File]::WriteAllText((Resolve-Path $Path), $c, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "fixed: $Path"
