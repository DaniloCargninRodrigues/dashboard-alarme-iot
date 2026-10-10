const DEVICE_ID_ESPERADO = "dashboard-web";
let payload = msg.payload;

if (typeof payload === "string") {
    try {
        payload = JSON.parse(payload);
    } catch (erro) {
        node.warn("Comando MQTT rejeitado: payload não contém JSON válido.");
        return null;
    }
}

if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.keys(payload).length === 0
) {
    node.warn("Comando MQTT rejeitado: payload vazio ou não é um objeto JSON.");
    return null;
}

if (payload.device_id !== DEVICE_ID_ESPERADO) {
    node.warn("Comando MQTT rejeitado: device_id ausente ou inesperado.");
    return null;
}

if (
    !Object.prototype.hasOwnProperty.call(payload, "button") ||
    (payload.button !== 0 && payload.button !== 1)
) {
    node.warn("Comando MQTT rejeitado: button deve ser o número 0 ou 1.");
    return null;
}

msg.payload = payload;
return msg;
