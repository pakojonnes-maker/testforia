$file = "apps\admin\src\components\layout\DashboardLayout.tsx"
$content = Get-Content $file

# Find and remove Reviews and Media entries (lines 111-120)
$newContent = @()
$skipUntil = -1

for ($i = 0; $i -lt $content.Length; $i++) {
  # Skip lines 111-120 (Reviews and Media - 0-indexed so 110-119)
  if ($i -ge 110 -and $i -le 119) {
    continue
  }
  
  # At line 110 (after Marketing), add Web entry
  if ($i -eq 110) {
    $newContent += "    { "
    $newContent += "      text: 'Web', "
    $newContent += "      icon: <WebIcon />, "
    $newContent += "      path: '/admin/landing' "
    $newContent += "    },"
  }
  
  $newContent += $content[$i]
}

Set-Content -Path $file -Value $newContent
Write-Host "Sidebar fixed successfully"
