# dashboard-alarme-iot
Interface front-end para monitoramento de registros e desligamento remoto de um alarme IoT. Trabalho acadêmico para a matéria de IoT.

## Gatekeeper Node-RED

O código pronto para colar num nó `Function` está em [`node-red-gatekeeper.js`](./node-red-gatekeeper.js). Insira o nó entre a entrada MQTT do tópico `phrsystem/teste/iot/comando` e o nó que publica o comando ao ESP32. Ele aceita comandos com `device_id: "dashboard-web"` e `button` numérico `0` ou `1`; mensagens inválidas são bloqueadas e registadas com `node.warn`.
