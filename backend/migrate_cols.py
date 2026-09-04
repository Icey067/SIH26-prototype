from sqlalchemy import text
from app.core.database import engine
from app.models.block import MaintenanceBlock

def sync_schema():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'maintenance_blocks'"))
        db_cols = {r[0] for r in res}
        print('Existing columns in DB:', len(db_cols))
        
        for col in MaintenanceBlock.__table__.columns:
            if col.name not in db_cols:
                col_type = 'VARCHAR(100)'
                t_str = str(col.type).lower()
                if 'int' in t_str:
                    col_type = 'INTEGER'
                elif 'float' in t_str:
                    col_type = 'FLOAT'
                elif 'date' in t_str or 'time' in t_str:
                    col_type = 'TIMESTAMP'
                elif 'bool' in t_str:
                    col_type = 'BOOLEAN'
                elif 'text' in t_str:
                    col_type = 'TEXT'
                
                stmt = f'ALTER TABLE maintenance_blocks ADD COLUMN IF NOT EXISTS {col.name} {col_type};'
                print('Adding:', stmt)
                conn.execute(text(stmt))
        conn.commit()
        print('All missing columns added successfully!')

if __name__ == '__main__':
    sync_schema()
