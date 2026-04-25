$projectDir = (Get-Item $PSScriptRoot).Name
$backendPathMatch = '*\' + $projectDir + '\backend\start.py*'
$frontendPathMatch = '*\' + $projectDir + '\frontend*'

# Stop backend: python process in this project's backend running start.py
$backendProcs = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -match 'python' -and
    $_.CommandLine -like $backendPathMatch
}
if ($backendProcs) {
    foreach ($p in $backendProcs) {
        $null = taskkill /PID $p.ProcessId /F /T 2>&1
        Write-Host "  Stopped backend PID: $($p.ProcessId)"
    }
} else {
    Write-Host "  No running backend found"
}

# Stop frontend: node process in this project's frontend path
$frontendProcs = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -like $frontendPathMatch
}
if ($frontendProcs) {
    foreach ($p in $frontendProcs) {
        $null = taskkill /PID $p.ProcessId /F /T 2>&1
        Write-Host "  Stopped frontend PID: $($p.ProcessId)"
    }
} else {
    Write-Host "  No running frontend found"
}

Write-Host "`nSparkBin services stopped!"
pause