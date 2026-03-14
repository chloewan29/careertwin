param(
    [string]$RootPath = ".",
    [string]$OutputPath = "audit-report.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-FileHashSafe {
    param([string]$Path)
    try {
        return (Get-FileHash -Path $Path -Algorithm SHA256).Hash
    } catch {
        return $null
    }
}

function Get-JsonFileSafe {
    param([string]$Path)
    try {
        return Get-Content -Raw -Path $Path | ConvertFrom-Json
    } catch {
        return $null
    }
}

$resolvedRoot = Resolve-Path -Path $RootPath

$report = [ordered]@{
    generated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    root_path = $resolvedRoot.Path
    summary = [ordered]@{}
    files = [ordered]@{}
    dependencies = [ordered]@{}
    findings = @()
}

# Key repository files
$keyFiles = @(
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "requirements.txt",
    "Pipfile",
    "Pipfile.lock",
    "pyproject.toml",
    "poetry.lock",
    "go.mod",
    "go.sum",
    "Cargo.toml",
    "Cargo.lock",
    "Gemfile",
    "Gemfile.lock",
    "composer.json",
    "composer.lock",
    "Dockerfile",
    "docker-compose.yml",
    ".env",
    ".env.example",
    ".gitignore",
    "README.md",
    "AGENTS.md"
)

$presentKeyFiles = @()
foreach ($relative in $keyFiles) {
    $full = Join-Path $resolvedRoot.Path $relative
    if (Test-Path -Path $full -PathType Leaf) {
        $presentKeyFiles += $relative
        $report.files[$relative] = [ordered]@{
            size_bytes = (Get-Item -Path $full).Length
            sha256 = Get-FileHashSafe -Path $full
        }
    }
}

# Count tracked source-like files
$sourceExtensions = @("*.js","*.ts","*.tsx","*.jsx","*.py","*.go","*.rs","*.java","*.cs","*.php","*.rb","*.sh","*.ps1","*.yaml","*.yml","*.json","*.toml","*.md")
$sourceCount = 0
foreach ($pattern in $sourceExtensions) {
    $sourceCount += (Get-ChildItem -Path $resolvedRoot.Path -Recurse -File -Filter $pattern -ErrorAction SilentlyContinue | Measure-Object).Count
}

$report.summary.key_files_found = $presentKeyFiles.Count
$report.summary.key_files = $presentKeyFiles
$report.summary.source_like_file_count = $sourceCount

# Dependency extraction (basic, no external tooling)
$pkgJsonPath = Join-Path $resolvedRoot.Path "package.json"
if (Test-Path -Path $pkgJsonPath -PathType Leaf) {
    $pkg = Get-JsonFileSafe -Path $pkgJsonPath
    if ($null -ne $pkg) {
        $deps = @{}
        $devDeps = @{}
        if ($pkg.PSObject.Properties.Name -contains "dependencies") {
            $deps = $pkg.dependencies
        }
        if ($pkg.PSObject.Properties.Name -contains "devDependencies") {
            $devDeps = $pkg.devDependencies
        }

        $report.dependencies.npm = [ordered]@{
            name = $pkg.name
            version = $pkg.version
            dependencies_count = ($deps.PSObject.Properties | Measure-Object).Count
            dev_dependencies_count = ($devDeps.PSObject.Properties | Measure-Object).Count
            dependencies = $deps
            dev_dependencies = $devDeps
        }
    } else {
        $report.findings += "package.json exists but could not be parsed as JSON."
    }
}

# Heuristic findings
$envPath = Join-Path $resolvedRoot.Path ".env"
if (Test-Path -Path $envPath -PathType Leaf) {
    $report.findings += ".env file is present. Ensure secrets are not committed."
}

$gitignorePath = Join-Path $resolvedRoot.Path ".gitignore"
if (Test-Path -Path $gitignorePath -PathType Leaf) {
    $gitignoreContent = Get-Content -Path $gitignorePath -ErrorAction SilentlyContinue
    if ($gitignoreContent -notcontains ".env") {
        $report.findings += ".gitignore does not explicitly include .env"
    }
}

if (-not (Test-Path -Path (Join-Path $resolvedRoot.Path "README.md") -PathType Leaf)) {
    $report.findings += "README.md is missing."
}

if (-not (Test-Path -Path (Join-Path $resolvedRoot.Path "AGENTS.md") -PathType Leaf)) {
    $report.findings += "AGENTS.md is missing."
}

$json = $report | ConvertTo-Json -Depth 10
$outFull = Join-Path $resolvedRoot.Path $OutputPath
$json | Set-Content -Path $outFull -Encoding UTF8

Write-Output "Audit script completed. Report written to: $outFull"
