import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    throw new Error(
        'Falta DATABASE_URL (o SUPABASE_DB_URL). Usa la cadena de conexión PostgreSQL de Supabase.'
    );
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

const mysqlDateFormatToPostgres = (format) => format
    .replace(/%Y/g, 'YYYY')
    .replace(/%m/g, 'MM')
    .replace(/%d/g, 'DD')
    .replace(/%H/g, 'HH24')
    .replace(/%i/g, 'MI')
    .replace(/%s/g, 'SS')
    .replace(/%u/g, 'IW');

const convertQuery = (sql, params) => {
    let text = sql
        .replace(/STR_TO_DATE\(\?,\s*'%d\/%m\/%Y'\)/gi, 'TO_DATE(?, \'DD/MM/YYYY\')')
        .replace(/GROUP_CONCAT\(([^()]+?)\s+SEPARATOR\s+([^)]+)\)/gi, 'STRING_AGG($1::text, $2)')
        .replace(/DATE_FORMAT\(([^,]+),\s*'([^']+)'\)/gi, (_, value, format) => (
            `TO_CHAR(${value}, '${mysqlDateFormatToPostgres(format)}')`
        ))
        .replace(/\bYEARWEEK\(([^,]+),\s*1\)/gi, "TO_CHAR($1, 'IYYYIW')::integer")
        .replace(/\bIFNULL\s*\(/gi, 'COALESCE(')
        .replace(/\bCURDATE\s*\(\s*\)/gi, 'CURRENT_DATE')
        .replace(/CURRENT_DATE\s*-\s*INTERVAL\s+1\s+DAY/gi, "CURRENT_DATE - INTERVAL '1 day'")
        .replace(/\bDATE\(([^()]+)\)/gi, 'CAST($1 AS DATE)')
        .replace(/\bNOW\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP');

    let queryParams = params;
    if (
        /\bVALUES\s+\?/i.test(text)
        && params.length === 1
        && Array.isArray(params[0])
        && params[0].every(Array.isArray)
    ) {
        const rows = params[0];
        let placeholder = 0;
        const tuples = rows.map((row) => (
            `(${row.map(() => `$${++placeholder}`).join(', ')})`
        ));
        text = text.replace(/\bVALUES\s+\?/i, `VALUES ${tuples.join(', ')}`);
        queryParams = rows.flat();
    }

    const values = queryParams.map((value) => (
        typeof value === 'string' && value.includes('%')
            ? mysqlDateFormatToPostgres(value)
            : value
    ));

    let index = 0;
    text = text.replace(/\?/g, () => `$${++index}`);

    return { text, values };
};

const extractInsertId = (row) => {
    if (!row) return undefined;
    const key = Object.keys(row).find((name) => /^id/i.test(name));
    return key ? row[key] : undefined;
};

const conexion = {
    query(sql, params, callback) {
        const values = Array.isArray(params) ? params : [];
        const done = typeof params === 'function' ? params : callback;
        const converted = convertQuery(sql, values);
        const isInsert = /^\s*INSERT\s/i.test(converted.text);
        const text = isInsert && !/\bRETURNING\b/i.test(converted.text)
            ? `${converted.text.trim().replace(/;$/, '')} RETURNING *`
            : converted.text;

        pool.query(text, converted.values, (error, result) => {
            if (typeof done !== 'function') return;

            if (error) {
                done(error);
                return;
            }

            const rows = result.rows;
            rows.insertId = extractInsertId(rows[0]);
            rows.affectedRows = result.rowCount;
            done(null, rows);
        });
    },
};

pool.query('SELECT 1')
    .then(() => console.log('✅ Conexión a PostgreSQL de Supabase correcta'))
    .catch((error) => console.error('❌ Error de conexión a Supabase:', error.message));

export default conexion;