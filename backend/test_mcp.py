import asyncio

from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


MCP_URL = "http://127.0.0.1:8000/mcp/"


async def main():
    async with streamable_http_client(MCP_URL) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:

            await session.initialize()

            tools = await session.list_tools()

            print("\nTOOLS:")
            for tool in tools.tools:
                print(tool.name)

            print("\nRECORDING FACT:")

            await session.call_tool(
                "record_incident_event",
                {
                    "type": "fact",
                    "text": "Database CPU utilization is 98%",
                },
            )

            await session.call_tool(
                "record_incident_event",
                {
                    "type": "fact",
                    "text": "Database CPU utilization is 2%",
                },
            )

            await session.call_tool(
                "record_incident_conflict",
                {
                    "description": (
                        "Database CPU utilization was reported as both "
                        "98% and 2% for the same observation window."
                    ),
                    "related_fact_ids": [
                        "8484aa34-39c5-40b3-b823-18c5f18b5fdd",
                        "f735a2f4-97a9-4094-bac0-75ddf255d5cf",
                    ],
                    "related_hypothesis_ids": [],
                },
            )

            print("\nCURRENT STATE:")

            state = await session.call_tool(
                "get_incident_state",
                {},
            )

            print(state)


if __name__ == "__main__":
    asyncio.run(main())