import os
from neo4j import GraphDatabase

class Neo4jClient:
    def __init__(self):
        self._driver = None
        self._failed = False

    @property
    def is_available(self) -> bool:
        return not self._failed

    @property
    def driver(self):
        if self._failed:
            return None
        if self._driver is None:
            uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
            user = os.environ.get("NEO4J_USER", "neo4j")
            password = os.environ.get("NEO4J_PASSWORD", "password")
            try:
                self._driver = GraphDatabase.driver(
                    uri,
                    auth=(user, password),
                    connection_timeout=2.0
                )
            except Exception as e:
                self.mark_failed(e)
                return None
        return self._driver

    def mark_failed(self, error=None):
        if not self._failed:
            self._failed = True
            print(f"[Neo4jClient] Neo4j is offline or unreachable ({error}). Automatically using in-memory graph store.")

    def close(self):
        if self._driver:
            try:
                self._driver.close()
            except Exception:
                pass
            self._driver = None

    def get_session(self):
        if self._failed or not self.driver:
            raise ConnectionError("Neo4j database unavailable. Using in-memory fallback.")
        return self.driver.session()

# Singleton instance
neo4j_client = Neo4jClient()


