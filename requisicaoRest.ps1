# Autentica e obtém o token de acesso
$token = & gcloud auth application-default print-access-token

# Lê o conteúdo do arquivo JSON (body.json)
$bodyContent = Get-Content -Path "bodymodel.example.json" -Raw

# Cria um arquivo temporário para o conteúdo JSON
$tempFile = "temp_body.json"
$bodyContent | Out-File -FilePath $tempFile -Encoding utf8

# Envia a requisição com curl e salva a resposta em output1.json
cmd /c "curl -X POST -H ""Authorization: Bearer $token"" -H ""Content-Type: application/json; charset=utf-8"" -d @$tempFile https://us-documentai.googleapis.com/v1/projects/286143711354/locations/us/processors/19a4c8074f538295:process > output1.json"

# Limpa o arquivo temporário após a execução
Remove-Item $tempFile
