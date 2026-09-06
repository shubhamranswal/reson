from contextlib import asynccontextmanager
from mcp.server.transport_security import TransportSecuritySettings
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI

from app.api.events import router as events_router
from app.api.incidents import router as incidents_router
from app.api.rooms import router as rooms_router
from app.mcp.server import server as mcp_server


mcp_app = mcp_server.streamable_http_app(
    streamable_http_path="/",
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=False,
    ),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with mcp_app.router.lifespan_context(mcp_app):
        yield


app = FastAPI(
    title="Reson",
    description="AI Incident Commander",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://reson-ai-lake.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "reson-backend",
    }


app.include_router(incidents_router)
app.include_router(rooms_router)
app.include_router(events_router)

app.mount("/mcp", mcp_app)