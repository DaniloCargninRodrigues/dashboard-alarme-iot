from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser

PORT = 8000  # If port 8000 is in use, change this to 8080 or 3000.


def main():
    server = HTTPServer(("", PORT), SimpleHTTPRequestHandler)
    print(f"Servidor iniciado na porta {PORT}.")
    print(f"Acesse: http://localhost:{PORT}/index.html")

    try:
        webbrowser.open('http://localhost:8000/index.html')
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
