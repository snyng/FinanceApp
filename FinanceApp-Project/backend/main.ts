import { sqlite } from "https://esm.town/v/std/sqlite";

export default async function (req: Request): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. 初始化数据库
    await sqlite.execute(`
      CREATE TABLE IF NOT EXISTS finance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const url = new URL(req.url);

    // 2. 获取数据
    if (req.method === "GET") {
      const recordsResult = await sqlite.execute(
        "SELECT * FROM finance_records ORDER BY created_at DESC LIMIT 50",
      );
      const statsResult = await sqlite.execute(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
        FROM finance_records
      `);

      return Response.json({
        records: recordsResult.rows.map((r: any) => ({
          id: r.id !== undefined ? r.id : r[0],
          type: r.type !== undefined ? r.type : r[1],
          amount: r.amount !== undefined ? r.amount : r[2],
          category: r.category !== undefined ? r.category : r[3],
          note: r.note !== undefined ? r.note : r[4],
          date: r.created_at !== undefined ? r.created_at : r[5],
        })),
        stats: {
          income: statsResult.rows[0]?.total_income ??
            statsResult.rows[0]?.[0] ?? 0,
          expense: statsResult.rows[0]?.total_expense ??
            statsResult.rows[0]?.[1] ?? 0,
        },
      }, { headers: corsHeaders });
    }

    // 3. 提交新数据
    if (req.method === "POST") {
      const { type, amount, category, note } = await req.json();

      await sqlite.execute({
        sql:
          "INSERT INTO finance_records (type, amount, category, note) VALUES (?, ?, ?, ?)",
        args: [type, parseFloat(amount), category, note || ""],
      });

      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // 4. 删除数据 
    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      await sqlite.execute({
        sql: "DELETE FROM finance_records WHERE id = ?",
        args: [id],
      });
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (error) {
    // 出错信息
    return Response.json({ error: error.message }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}