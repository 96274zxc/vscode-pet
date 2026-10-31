param(
	[Parameter(Position = 0)][string]$ManifestPath = '',
	[Parameter(Position = 1)][string]$ParentPid = '0',
	[switch]$Warmup,
	[switch]$SelfTest,
	[switch]$Prepared
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try {
	[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
	$OutputEncoding = [Console]::OutputEncoding
} catch {
}

$sourceFiles = @(Get-ChildItem -Path (Join-Path $PSScriptRoot 'BlobbyDesktop.*.cs') | Sort-Object Name | ForEach-Object { $_.FullName })
if ($sourceFiles.Count -eq 0) {
	[Console]::Error.WriteLine('blobby-desktop: no C# sources found')
	exit 2
}

$hashBuilder = New-Object System.Text.StringBuilder
foreach ($file in $sourceFiles) {
	[void]$hashBuilder.Append((Get-Content -Raw -LiteralPath $file))
	[void]$hashBuilder.Append("`n")
}
[void]$hashBuilder.Append('blobby-desktop-helper-v1')
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = ([BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($hashBuilder.ToString())))).Replace('-', '').ToLowerInvariant()
$hash = $hash.Substring(0, 16)

$cacheDir = Join-Path $env:LOCALAPPDATA 'dsh-blobby-desktop\cache'
try {
	New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
} catch {
}
$dllPath = Join-Path $cacheDir "$hash.dll"

$references = @(
	'PresentationFramework',
	'PresentationCore',
	'WindowsBase',
	'System.Xaml',
	'System.Web.Extensions',
	'System.Drawing',
	'System.Core'
)

$loaded = $false
if (Test-Path -LiteralPath $dllPath) {
	try {
		[void][System.Reflection.Assembly]::LoadFrom($dllPath)
		$loaded = $true
	} catch {
		Remove-Item -LiteralPath $dllPath -Force -ErrorAction SilentlyContinue
	}
}
if (-not $loaded) {
	try {
		Add-Type -Path $sourceFiles -ReferencedAssemblies $references -OutputAssembly $dllPath -OutputType Library
		[void][System.Reflection.Assembly]::LoadFrom($dllPath)
	} catch {
		[Console]::Error.WriteLine('blobby-desktop: helper compilation failed: ' + $_.Exception.Message)
		exit 2
	}
}

if ($Warmup) {
	try {
		[void][BlobbyDesktop.Program]::Warmup()
		exit 0
	} catch {
		[Console]::Error.WriteLine('blobby-desktop: warmup failed: ' + $_.Exception.Message)
		exit 2
	}
}

if ($SelfTest) {
	try {
		$code = [BlobbyDesktop.Program]::SelfTest($ManifestPath)
		exit $code
	} catch {
		[Console]::Error.WriteLine('blobby-desktop: self-test failed: ' + $_.Exception.Message)
		exit 2
	}
}

try {
	$preparedFlag = if ($Prepared) { '1' } else { '0' }
	$code = [BlobbyDesktop.Program]::Run($ManifestPath, $ParentPid, $preparedFlag)
	exit $code
} catch {
	[Console]::Error.WriteLine('blobby-desktop: run failed: ' + $_.Exception.Message)
	exit 2
}
