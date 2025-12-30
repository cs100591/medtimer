import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

// Local SQLite database for offline-first functionality
class LocalDatabase {
  static Database? _database;
  static const String _dbName = 'medication_reminder.db';
  static const int _dbVersion = 1;

  static Future<Database> get database async {
    _database ??= await _initDatabase();
    return _database!;
  }

  static Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, _dbName);

    return await openDatabase(
      path,
      version: _dbVersion,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  static Future<void> _onCreate(Database db, int version) async {
    // Users table
    await db.execute('''
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        language TEXT DEFAULT 'en',
        timezone TEXT DEFAULT 'UTC',
        preferences TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
      )
    ''');

    // Medications table
    await db.execute('''
      CREATE TABLE medications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        generic_name TEXT,
        dosage TEXT NOT NULL,
        form TEXT NOT NULL,
        instructions TEXT,
        is_critical INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        current_supply INTEGER,
        low_supply_threshold INTEGER,
        cost_per_unit REAL,
        currency TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    ''');

    // Schedules table
    await db.execute('''
      CREATE TABLE schedules (
        id TEXT PRIMARY KEY,
        medication_id TEXT NOT NULL,
        frequency_type TEXT NOT NULL,
        times TEXT NOT NULL,
        days_of_week TEXT,
        interval_days INTEGER,
        duration_type TEXT NOT NULL,
        end_date TEXT,
        total_days INTEGER,
        cycle_days_on INTEGER,
        cycle_days_off INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        FOREIGN KEY (medication_id) REFERENCES medications(id)
      )
    ''');

    // Adherence records table
    await db.execute('''
      CREATE TABLE adherence_records (
        id TEXT PRIMARY KEY,
        medication_id TEXT NOT NULL,
        schedule_id TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        actual_time TEXT,
        status TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT,
        FOREIGN KEY (medication_id) REFERENCES medications(id),
        FOREIGN KEY (schedule_id) REFERENCES schedules(id)
      )
    ''');

    // Pending sync queue
    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    ''');

    // Create indexes
    await db.execute('CREATE INDEX idx_medications_user ON medications(user_id)');
    await db.execute('CREATE INDEX idx_schedules_medication ON schedules(medication_id)');
    await db.execute('CREATE INDEX idx_adherence_medication ON adherence_records(medication_id)');
    await db.execute('CREATE INDEX idx_adherence_scheduled ON adherence_records(scheduled_time)');
  }

  static Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    // Handle migrations for future versions
  }

  static Future<void> close() async {
    if (_database != null) {
      await _database!.close();
      _database = null;
    }
  }
}
