# 🚨 Sistema de Monitoramento de Alarme IoT

Sistema bidirecional de monitoramento de alarme com ESP32 e sensor PIR. O dispositivo envia eventos de movimento via MQTT; o Node-RED processa os dados e armazena o histórico no InfluxDB v2. O dashboard web consulta a atividade e permite enviar comandos para ativar ou desativar o alarme.

Repositório: [DaniloCargninRodrigues/dashboard-alarme-iot](https://github.com/DaniloCargninRodrigues/dashboard-alarme-iot)

## 🎮 Simulação online

Teste o hardware virtualmente no Wokwi:

[https://wokwi.com/projects/475456569702756353](https://wokwi.com/projects/475456569702756353)

## 🧰 Tecnologias utilizadas

- **ESP32** e **sensor PIR** — leitura de movimento e controle do alarme.
- **MQTT** — comunicação bidirecional entre o dispositivo, o Node-RED e o dashboard.
- **Eclipse Mosquitto** — broker MQTT para a comunicação entre os componentes.
- **Node-RED** — processamento das mensagens e integração dos serviços.
- **InfluxDB v2** — armazenamento do histórico de eventos.
- **HTML, CSS e JavaScript** — interface web de monitoramento.
- **Docker Compose** — execução dos serviços de infraestrutura.

## 📋 Pré-requisitos

- **Docker** com suporte ao comando `docker compose`.
- **Git**.
- **Python 3** para iniciar o servidor local do dashboard.
- **ngrok** para disponibilizar serviços localmente durante testes externos.

## 🚀 Como rodar o projeto localmente

### 1. Infraestrutura

Clone o repositório e entre na pasta:

```bash
git clone https://github.com/DaniloCargninRodrigues/dashboard-alarme-iot.git
cd dashboard-alarme-iot
```

Defina a senha inicial e o token de administração do InfluxDB antes de subir os contêineres. Use valores fortes e mantenha-os em segredo. No PowerShell:

```powershell
$env:INFLUXDB_INIT_PASSWORD = "defina-uma-senha-forte"
$env:INFLUXDB_INIT_ADMIN_TOKEN = "defina-um-token-forte"
```

No Bash:

```bash
export INFLUXDB_INIT_PASSWORD="defina-uma-senha-forte"
export INFLUXDB_INIT_ADMIN_TOKEN="defina-um-token-forte"
```

Antes de iniciar o Compose, crie ou disponibilize `mosquitto.conf` na raiz do projeto. O arquivo é montado pelo serviço Mosquitto e deve habilitar o listener MQTT na porta **1883**.

Inicie os contêineres:

```bash
docker compose up -d
```

### 2. Configuração do backend (crucial)

1. Acesse o editor do Node-RED em [http://localhost:1880](http://localhost:1880).
2. Importe o arquivo `flows.json` do repositório usando o menu **Import** do Node-RED.
3. Abra a configuração do nó de banco de dados InfluxDB e informe o valor definido em `INFLUXDB_INIT_ADMIN_TOKEN` no ambiente. O fluxo usa a organização `PHRSystem` e o bucket `sensor_alarme`.

> **Importante:** conclua a importação do fluxo e configure o token do InfluxDB antes de iniciar o frontend. Sem essa configuração, o backend não conseguirá gravar o histórico e o sistema não funcionará corretamente.

### 3. Frontend oficial

Depois de configurar o backend, inicie o servidor web local na raiz do projeto:

```bash
python -m http.server 8000
```

Abra o dashboard principal em [http://localhost:8000](http://localhost:8000).

> **Duas interfaces:** o projeto inclui um dashboard de diagnóstico nativo do Node-RED, em [http://localhost:1880/dashboard](http://localhost:1880/dashboard), para testes rápidos de hardware, e o dashboard principal de monitoramento em HTML/CSS/JavaScript, servido na porta 8000.

### 🌐 Endereços locais

| Serviço | Endereço |
| --- | --- |
| Dashboard web | [http://localhost:8000](http://localhost:8000) |
| Node-RED | [http://localhost:1880](http://localhost:1880) |
| InfluxDB v2 | [http://localhost:8086](http://localhost:8086) |
| Mosquitto MQTT | `localhost:1883` |

## 🔐 Configuração importante do InfluxDB

> **Atenção:** o `docker-compose.yml` recebe o token de administração inicial do InfluxDB pela variável de ambiente `INFLUXDB_INIT_ADMIN_TOKEN`. Informe o mesmo valor como token na configuração do nó InfluxDB dentro do Node-RED. Use também a organização `PHRSystem` e o bucket `sensor_alarme` configurados no Compose. Sem o token correto, o Node-RED não conseguirá gravar o histórico e poderá retornar erro `unauthorized`.

O Compose exige que `INFLUXDB_INIT_PASSWORD` esteja definida antes da inicialização. O usuário inicial configurado é `admin`. O InfluxDB aplica essas credenciais e o token de bootstrap na primeira inicialização do volume; alterar os valores no Compose depois que o volume já foi criado não reconfigura automaticamente a instância existente.

Mantenha a senha e o token fora do repositório. Antes de usar o sistema em um ambiente compartilhado ou de produção, armazene-os em um gestor de segredos apropriado.

## 🌍 Expondo o broker MQTT com o ngrok

Para que o hardware simulado no Wokwi consiga se comunicar com a infraestrutura local, exponha o broker MQTT (Mosquitto) usando um túnel TCP:

```bash
ngrok tcp 1883
```

> **Segurança:** mantenha o túnel TCP aberto somente durante a realização dos testes e encerre-o quando terminar.
