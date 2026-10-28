# Servidor local simples para o Treino de Inglês.
# Serve os arquivos desta pasta em http://localhost:PORTA/ (necessário para os vídeos do YouTube).
param([switch]$SemAbrir)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path

$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
  '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.txt' = 'text/plain; charset=utf-8'
}

$listener = $null
foreach ($porta in 8765..8775) {
  try {
    $l = New-Object System.Net.HttpListener
    $l.Prefixes.Add("http://localhost:$porta/")
    $l.Start()
    $listener = $l
    break
  } catch { }
}
if (-not $listener) { Write-Host 'Nao foi possivel abrir uma porta entre 8765 e 8775.'; Read-Host 'Enter para sair'; exit 1 }

$url = $listener.Prefixes | Select-Object -First 1
Write-Host ''
Write-Host '  Treino de Ingles rodando em' $url
Write-Host '  Deixe esta janela aberta enquanto usa o app. Feche-a para encerrar.'
Write-Host ''
if (-not $SemAbrir) { Start-Process $url }

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $resp = $ctx.Response
  try {
    $caminho = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($caminho -eq '') { $caminho = 'index.html' }
    $arquivo = [IO.Path]::GetFullPath((Join-Path $raiz $caminho))
    if (-not $arquivo.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $arquivo -PathType Leaf)) {
      $resp.StatusCode = 404
      $bytes = [Text.Encoding]::UTF8.GetBytes('Nao encontrado')
    } else {
      $ext = [IO.Path]::GetExtension($arquivo).ToLower()
      $resp.ContentType = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { 'application/octet-stream' }
      $resp.Headers.Add('Cache-Control', 'no-store')
      $bytes = [IO.File]::ReadAllBytes($arquivo)
    }
    $resp.ContentLength64 = $bytes.Length
    $resp.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch { } finally { $resp.Close() }
}
