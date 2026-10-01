import os
from typing import Optional
from dotenv import load_dotenv
from caveclient import CAVEclient

# Load environment variables from .env
load_dotenv()

DEFAULT_DATASTACK = os.getenv("DATASET_NAME", "flywire_fafb_production")


def get_flywire_token() -> Optional[str]:
    """Retrieve FlyWire CAVE token from environment variables."""
    return os.getenv("FLYWIRE_CAVE_TOKEN") or os.getenv("CAVE_TOKEN")


def create_client(
    datastack_name: str = DEFAULT_DATASTACK,
    auth_token: Optional[str] = None
) -> CAVEclient:
    """
    Initialize and return a CAVEclient for FlyWire FAFB.
    
    Args:
        datastack_name: The target datastack (e.g., 'flywire_fafb_production')
        auth_token: Optional explicit auth token. If not provided, env variable or
                    CAVE local credentials cache (~/.cloudvolume/secrets) will be used.
                    
    Returns:
        CAVEclient instance connected to the specified datastack.
    """
    token = auth_token or get_flywire_token()
    
    try:
        if token:
            client = CAVEclient(datastack_name=datastack_name, auth_token=token)
        else:
            # Fall back to CAVE default token search (cached login)
            client = CAVEclient(datastack_name=datastack_name)
            
        # Quick health/metadata check
        tables = client.materialize.get_tables()
        return client
    except Exception as e:
        msg = (
            f"Failed to connect to CAVEclient datastack '{datastack_name}': {e}\n"
            "Please ensure you have a valid FlyWire token set in .env as FLYWIRE_CAVE_TOKEN "
            "or run CAVE login: https://global.daf-apis.com/auth/api/v1/user/token"
        )
        raise RuntimeError(msg) from e


if __name__ == "__main__":
    print(f"Connecting to CAVEclient ({DEFAULT_DATASTACK})...")
    try:
        client = create_client()
        tables = client.materialize.get_tables()
        print(f"Successfully connected! Found {len(tables)} tables.")
        print(f"Sample tables: {tables[:5]}")
    except Exception as err:
        print(f"Connection check result: {err}")
