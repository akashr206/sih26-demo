import os
from neo4j import GraphDatabase

class Neo4jClient:
    def __init__(self):
        self._driver = None

    @property
    def driver(self):
        if self._driver is None:
            uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
            user = os.environ.get("NEO4J_USER", "neo4j")
            password = os.environ.get("NEO4J_PASSWORD", "password")
            self._driver = GraphDatabase.driver(
                uri,
                auth=(user, password),
                connection_timeout=5.0
            )
        return self._driver

    def close(self):
        if self._driver:
            self._driver.close()
            self._driver = None

    def get_session(self):
        return self.driver.session()

# Singleton instance
neo4j_client = Neo4jClient()

