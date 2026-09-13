from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from backend.database.connection import sqlalchemy_database_url

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)
target_metadata = None


def run_migrations_offline() -> None:
    context.configure(url=sqlalchemy_database_url(), target_metadata=None, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(sqlalchemy_database_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_offline() if context.is_offline_mode() else run_migrations_online()
