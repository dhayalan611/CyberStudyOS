"""Run the personal V1 API on loopback; this is not a public deployment entrypoint."""
import uvicorn


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)
