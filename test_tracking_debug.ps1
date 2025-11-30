# Script de diagnóstico completo para tracking
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DIAGNÓSTICO COMPLETO DE TRACKING" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "https://visualtasteworker.franciscotortosaestudios.workers.dev"
$restaurantId = "rest_yucas_01"

# ============================================
# TEST 1: Session Start
# ============================================
Write-Host "=== TEST 1: Session Start ===" -ForegroundColor Yellow

$sessionBody = @{
    restaurantId = $restaurantId
    devicetype = "desktop"
    osname = "Windows"
    browser = "Chrome"
    referrer = $null
    utm = @{}
    networktype = "4g"
    ispwa = $false
    languages = "es"
    timezone = "-60"
} | ConvertTo-Json

try {
    $sessionResponse = Invoke-RestMethod `
        -Uri "$baseUrl/track/session/start" `
        -Method Post `
        -ContentType "application/json" `
        -Body $sessionBody
    
    Write-Host "✅ Session Start SUCCESS!" -ForegroundColor Green
    $sessionResponse | ConvertTo-Json
    
    $sessionId = $sessionResponse.sessionId
    Write-Host "`n📋 Session ID: $sessionId" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Session Start FAILED:" -ForegroundColor Red
    $_.Exception.Message
    exit
}

# ============================================
# TEST 2: Track Events - CART CREATED
# ============================================
Write-Host "`n=== TEST 2: Track Events (CART) ===" -ForegroundColor Yellow

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
Write-Host "Timestamp: $timestamp" -ForegroundColor Gray

$eventsBody = @{
    sessionId = $sessionId
    restaurantId = $restaurantId
    events = @(
        @{
            type = "cart_created"
            entityId = "cart_test_123"
            entityType = "cart"
            ts = $timestamp
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "`nPayload enviado:" -ForegroundColor Gray
Write-Host $eventsBody -ForegroundColor DarkGray

try {
    $eventsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/track/events" `
        -Method Post `
        -ContentType "application/json" `
        -Body $eventsBody
    
    Write-Host "`n✅ Track Events SUCCESS!" -ForegroundColor Green
    $eventsResponse | ConvertTo-Json
    
    if ($eventsResponse.processed -eq 0) {
        Write-Host "`n⚠️ WARNING: processed = 0 (no se procesó ningún evento)" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Eventos procesados: $($eventsResponse.processed)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Track Events FAILED:" -ForegroundColor Red
    $_.Exception.Message
}

# ============================================
# TEST 3: Track Events - VIEW DISH
# ============================================
Write-Host "`n=== TEST 3: Track Events (VIEW DISH) ===" -ForegroundColor Yellow

$timestamp2 = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$eventsBody2 = @{
    sessionId = $sessionId
    restaurantId = $restaurantId
    events = @(
        @{
            type = "viewdish"
            entityId = "dish_yucas_hamburguesa_01"
            entityType = "dish"
            sectionId = "section_yucas_principales_01"
            ts = $timestamp2
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "`nPayload enviado:" -ForegroundColor Gray
Write-Host $eventsBody2 -ForegroundColor DarkGray

try {
    $eventsResponse2 = Invoke-RestMethod `
        -Uri "$baseUrl/track/events" `
        -Method Post `
        -ContentType "application/json" `
        -Body $eventsBody2
    
    Write-Host "`n✅ Track Events SUCCESS!" -ForegroundColor Green
    $eventsResponse2 | ConvertTo-Json
    
    if ($eventsResponse2.processed -eq 0) {
        Write-Host "`n⚠️ WARNING: processed = 0 (no se procesó ningún evento)" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Eventos procesados: $($eventsResponse2.processed)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Track Events FAILED:" -ForegroundColor Red
    $_.Exception.Message
}

# ============================================
# TEST 4: Track Events - DISH VIEW DURATION (NUEVO)
# ============================================
Write-Host "`n=== TEST 4: Track Events (DISH VIEW DURATION) ===" -ForegroundColor Yellow

$timestamp3 = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

$eventsBody3 = @{
    sessionId = $sessionId
    restaurantId = $restaurantId
    events = @(
        @{
            type = "dish_view_duration"
            entityId = "dish_yucas_hamburguesa_01"
            entityType = "dish"
            value = 15
            sectionId = "section_yucas_principales_01"
            props = @{
                duration_seconds = 15
            }
            ts = $timestamp3
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "`nPayload enviado:" -ForegroundColor Gray
Write-Host $eventsBody3 -ForegroundColor DarkGray

try {
    $eventsResponse3 = Invoke-RestMethod `
        -Uri "$baseUrl/track/events" `
        -Method Post `
        -ContentType "application/json" `
        -Body $eventsBody3
    
    Write-Host "`n✅ Track Events SUCCESS!" -ForegroundColor Green
    $eventsResponse3 | ConvertTo-Json
    
    if ($eventsResponse3.processed -eq 0) {
        Write-Host "`n⚠️ WARNING: processed = 0 (no se procesó ningún evento)" -ForegroundColor Yellow
    } else {
        Write-Host "`n✅ Eventos procesados: $($eventsResponse3.processed)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ Track Events FAILED:" -ForegroundColor Red
    $_.Exception.Message
}

# ============================================
# RESUMEN
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Session ID: $sessionId" -ForegroundColor White
Write-Host "`n⚠️ SI 'processed' = 0 en todos los tests," -ForegroundColor Yellow
Write-Host "el problema está en el WORKER (no en el cliente)" -ForegroundColor Yellow
Write-Host "`nRevisa los logs en Cloudflare Workers Dashboard:" -ForegroundColor White
Write-Host "https://dash.cloudflare.com → Workers & Pages → workerTracking → Logs" -ForegroundColor Cyan
Write-Host "`n========================================`n" -ForegroundColor Cyan
