"""
Execute este script UMA VEZ para migrar o banco de dados.
Rode na pasta backend:
    python migrate.py
"""
import sqlite3
import os

DB_PATH = "finance.db"

if not os.path.exists(DB_PATH):
    print("Banco não encontrado. Será criado automaticamente ao iniciar o servidor.")
    exit(0)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

migrations = [
    # Torna due_day nullable na tabela recurring (SQLite não suporta ALTER COLUMN, precisa recriar)
    # Adiciona is_variable se não existir
    ("is_variable em recurring", "ALTER TABLE recurring ADD COLUMN is_variable INTEGER NOT NULL DEFAULT 0"),
    # Adiciona total_pending no schema (não precisa de migration — é calculado em runtime)
]

for name, sql in migrations:
    try:
        cursor.execute(sql)
        print(f"✅ {name}")
    except Exception as e:
        print(f"⏭️  {name} — já existe ou não necessário ({e})")

# Corrige due_day nullable recriando a tabela
try:
    cursor.execute("PRAGMA table_info(recurring)")
    cols = cursor.fetchall()
    due_day_col = next((c for c in cols if c[1] == "due_day"), None)

    if due_day_col and due_day_col[3] == 1:  # notnull=1
        print("🔧 Corrigindo due_day para nullable...")
        cursor.executescript("""
            BEGIN;
            CREATE TABLE IF NOT EXISTS recurring_new (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                due_day INTEGER,
                category_id INTEGER,
                icon TEXT DEFAULT '📄',
                active INTEGER DEFAULT 1,
                is_variable INTEGER DEFAULT 0
            );
            INSERT INTO recurring_new SELECT id, name, amount, due_day, category_id, icon, active,
                COALESCE(is_variable, 0) FROM recurring;
            DROP TABLE recurring;
            ALTER TABLE recurring_new RENAME TO recurring;
            COMMIT;
        """)
        print("✅ due_day agora é nullable")
    else:
        print("⏭️  due_day já é nullable")
except Exception as e:
    print(f"❌ Erro na migração de due_day: {e}")

conn.commit()
conn.close()
print("\n✅ Migração concluída! Pode iniciar o servidor.")