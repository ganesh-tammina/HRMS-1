#!/usr/bin/env pwsh
# HRMS Deployment Verification Script
# Run this to verify your Ionic + Node.js deployment is configured correctly

param([switch]$Verbose)

Write-Host ""
Write-Host "HRMS Deployment Verification" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# ============================================
# 1. Check Frontend Build Configuration
# ============================================
Write-Host "1️⃣  Frontend Build Configuration" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

$angularJson = "e:\B\HRMS_new\public\angular.json"
if (Test-Path $angularJson) {
    $content = Get-Content $angularJson | ConvertFrom-Json
    $outputPath = $content.projects.app.architect.build.options.outputPath
    $baseHref = $content.projects.app.architect.build.options.baseHref
    
    if ($outputPath -eq "www") {
        Write-Host "  ✅ outputPath: www" -ForegroundColor Green
    } else {
        $errors += "outputPath should be 'www', found: $outputPath"
        Write-Host "  ❌ outputPath: $outputPath (should be 'www')" -ForegroundColor Red
    }
    
    if ($baseHref -eq "/") {
        Write-Host "  ✅ baseHref: /" -ForegroundColor Green
    } else {
        $errors += "baseHref should be '/', found: $baseHref"
        Write-Host "  ❌ baseHref: $baseHref (should be '/')" -ForegroundColor Red
    }
} else {
    $errors += "angular.json not found at $angularJson"
}

# ============================================
# 2. Check index.html
# ============================================
Write-Host ""
Write-Host "2️⃣  index.html Configuration" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

$indexHtml = "e:\B\HRMS_new\public\src\index.html"
if (Test-Path $indexHtml) {
    $content = Get-Content $indexHtml -Raw
    
    if ($content -match '<base href="/"') {
        Write-Host "  ✅ base href is /" -ForegroundColor Green
    } else {
        $warnings += "base href might not be set correctly"
        Write-Host "  ⚠️  base href not found or incorrect" -ForegroundColor Yellow
    }
    
    if ($content -match "document.createElement.bind") {
        Write-Host "  ✅ CSS media interception script present" -ForegroundColor Green
    } else {
        $warnings += "CSS interception script missing"
        Write-Host "  ⚠️  CSS interception script not found" -ForegroundColor Yellow
    }
    
    if ($content -match "\.ion-page-invisible\s*\{" -or $content -match "ion-page-invisible") {
        Write-Host "  ✅ Visibility override styles present" -ForegroundColor Green
    } else {
        $warnings += "Visibility override styles might be missing"
        Write-Host "  ⚠️  Visibility override styles not found" -ForegroundColor Yellow
    }
} else {
    $errors += "index.html not found at $indexHtml"
}

# ============================================
# 3. Check global.scss
# ============================================
Write-Host ""
Write-Host "3️⃣  global.scss Ionic Imports" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

$globalScss = "e:\B\HRMS_new\public\src\global.scss"
if (Test-Path $globalScss) {
    $content = Get-Content $globalScss -Raw
    
    $ionicImports = @(
        "@ionic/angular/css/core.css",
        "@ionic/angular/css/normalize.css",
        "@ionic/angular/css/structure.css",
        "@ionic/angular/css/typography.css",
        "@ionic/angular/css/display.css",
        "@ionic/angular/css/padding.css",
        "@ionic/angular/css/flex-utils.css"
    )
    
    $missingImports = @()
    foreach ($import in $ionicImports) {
        if ($content -match [regex]::Escape($import)) {
            Write-Host "  ✅ $import" -ForegroundColor Green
        } else {
            $missingImports += $import
            Write-Host "  ❌ $import" -ForegroundColor Red
            $errors += "Missing Ionic import: $import"
        }
    }
} else {
    $errors += "global.scss not found"
}

# ============================================
# 4. Check Build Output
# ============================================
Write-Host ""
Write-Host "4️⃣  Build Output" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

$buildDir = "e:\B\HRMS_new\public\www\browser"
if (Test-Path $buildDir) {
    $fileCount = (Get-ChildItem $buildDir -Recurse | Measure-Object).Count
    Write-Host "  ✅ Build directory exists: $buildDir" -ForegroundColor Green
    Write-Host "     Files: $fileCount" -ForegroundColor Green
    
    $indexFile = Join-Path $buildDir "index.html"
    $cssFile = @(Get-ChildItem $buildDir -Filter "styles-*.css" -ErrorAction SilentlyContinue)
    $jsFile = @(Get-ChildItem $buildDir -Filter "main-*.js" -ErrorAction SilentlyContinue)
    
    if (Test-Path $indexFile) {
        Write-Host "  ✅ index.html present" -ForegroundColor Green
    } else {
        $errors += "index.html not in build output"
        Write-Host "  ❌ index.html missing" -ForegroundColor Red
    }
    
    if ($cssFile.Count -gt 0) {
        $cssSize = [math]::Round($cssFile[0].Length / 1KB, 1)
        Write-Host "  ✅ styles-*.css present ($cssSize KB)" -ForegroundColor Green
    } else {
        $errors += "styles-*.css not found"
        Write-Host "  ❌ styles-*.css missing" -ForegroundColor Red
    }
    
    if ($jsFile.Count -gt 0) {
        Write-Host "  ✅ main-*.js present" -ForegroundColor Green
    } else {
        $errors += "main-*.js not found"
        Write-Host "  ❌ main-*.js missing" -ForegroundColor Red
    }
} else {
    $errors += "Build output directory not found. Run 'npm run build' first"
    Write-Host "  ❌ Build directory not found" -ForegroundColor Red
}

# ============================================
# 5. Check server.js Configuration
# ============================================
Write-Host ""
Write-Host "5️⃣  server.js Configuration" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

$serverJs = "e:\B\HRMS_new\server.js"
if (Test-Path $serverJs) {
    $content = Get-Content $serverJs -Raw
    
    if ($content -match "express.static.*www.*browser") {
        Write-Host "  ✅ Static file serving configured" -ForegroundColor Green
    } else {
        $errors += "Static file serving not configured correctly"
        Write-Host "  ❌ Static file serving not found" -ForegroundColor Red
    }
    
    if ($content -match "text/css.*charset=UTF-8") {
        Write-Host "  ✅ CSS MIME type configured" -ForegroundColor Green
    } else {
        $warnings += "CSS MIME type might not be configured"
        Write-Host "  ⚠️  CSS MIME type not found" -ForegroundColor Yellow
    }
    
    if ($content -match "application/javascript") {
        Write-Host "  ✅ JavaScript MIME type configured" -ForegroundColor Green
    } else {
        $warnings += "JavaScript MIME type might not be configured"
        Write-Host "  ⚠️  JavaScript MIME type not found" -ForegroundColor Yellow
    }
    
    if ($content -match "SPA fallback.*ngIf|app.get.*\\\^\(\?!") {
        Write-Host "  ✅ SPA fallback route configured" -ForegroundColor Green
    } else {
        $warnings += "SPA fallback route might not be correct"
        Write-Host "  ⚠️  SPA fallback route not found" -ForegroundColor Yellow
    }
} else {
    $errors += "server.js not found"
}

# ============================================
# 6. Check Environment Files
# ============================================
Write-Host ""
Write-Host "6️⃣  Environment Configuration" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

$envFile = "e:\B\HRMS_new\.env"
if (Test-Path $envFile) {
    Write-Host "  ✅ .env file present" -ForegroundColor Green
} else {
    $warnings += ".env file not found (will use defaults)"
    Write-Host "  ⚠️  .env file not found" -ForegroundColor Yellow
}

# ============================================
# 7. Check Server Status
# ============================================
Write-Host ""
Write-Host "7️⃣  Server Status" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Gray

$port = 3000
$server = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue

if ($server.TcpTestSucceeded) {
    Write-Host "  ✅ Server is running on port $port" -ForegroundColor Green
} else {
    $info += "Server not running on port $port"
    Write-Host "  ℹ️  Server not running on port $port" -ForegroundColor Cyan
    Write-Host "     Start with: node e:\B\HRMS_new\server.js" -ForegroundColor Cyan
}

# ============================================
# Summary
# ============================================
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host ""
    Write-Host "✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your deployment is production-ready:" -ForegroundColor Green
    Write-Host "  1. Run: npm run build (in public folder)" -ForegroundColor Green
    Write-Host "  2. Run: node server.js" -ForegroundColor Green
    Write-Host "  3. Visit: http://localhost:3000" -ForegroundColor Green
} else {
    if ($errors.Count -gt 0) {
        Write-Host ""
        Write-Host "❌ ERRORS ($($errors.Count)):" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  • $error" -ForegroundColor Red
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  WARNINGS ($($warnings.Count)):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  • $warning" -ForegroundColor Yellow
        }
    }
}

if ($info.Count -gt 0 -and $Verbose) {
    Write-Host ""
    Write-Host "ℹ️  INFO:" -ForegroundColor Cyan
    foreach ($item in $info) {
        Write-Host "  • $item" -ForegroundColor Cyan
    }
}

Write-Host ""
