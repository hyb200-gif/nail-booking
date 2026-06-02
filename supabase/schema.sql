-- ============================================================
-- 美甲预约系统 — 数据库设计
-- Supabase (PostgreSQL)
-- ============================================================

-- ----------------------------------------------------------
-- 1. 枚举类型
-- ----------------------------------------------------------

CREATE TYPE appointment_status AS ENUM (
  'pending',    -- 待确认
  'confirmed',  -- 已确认
  'completed',  -- 已完成
  'cancelled'   -- 已取消
);

-- ----------------------------------------------------------
-- 2. 美甲项目表 services
-- ----------------------------------------------------------

CREATE TABLE services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,                          -- 项目名称，如「纯色美甲」
  description TEXT,                                   -- 项目描述
  price       NUMERIC(10, 2) NOT NULL,                -- 价格（元）
  duration    INTEGER NOT NULL DEFAULT 60,            -- 时长（分钟）
  image_url   TEXT,                                   -- 项目封面图
  sort_order  INTEGER NOT NULL DEFAULT 0,             -- 排序权重
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,          -- 是否上架
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE services IS '美甲项目/服务列表';

-- ----------------------------------------------------------
-- 3. 营业时段模板表 time_slot_templates
--    定义每天可预约的标准时段（如 10:00-20:00，每30分钟一档）
-- ----------------------------------------------------------

CREATE TABLE time_slot_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time  TIME NOT NULL,                          -- 如 10:00
  end_time    TIME NOT NULL,                          -- 如 10:30
  day_of_week INTEGER,                                -- 0=周日 … 6=周六，NULL=每天
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_day CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6)
);

COMMENT ON TABLE time_slot_templates IS '每日可预约时段模板';

-- ----------------------------------------------------------
-- 4. 特殊日期配置表 special_dates
--    处理节假日闭店、临时加班等
-- ----------------------------------------------------------

CREATE TABLE special_dates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL UNIQUE,
  is_closed   BOOLEAN NOT NULL DEFAULT FALSE,         -- TRUE=全天闭店
  note        TEXT,                                   -- 备注，如「春节休业」
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE special_dates IS '特殊日期（闭店/加班）';

-- ----------------------------------------------------------
-- 5. 预约表 appointments（核心）
-- ----------------------------------------------------------

CREATE TABLE appointments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES services(id),
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  status      appointment_status NOT NULL DEFAULT 'pending',
  note        TEXT,                                   -- 用户备注 / 管理员备注
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 同一时段只能有一个有效预约（排除已取消）
  CONSTRAINT valid_phone CHECK (customer_phone ~ '^\d{11}$')
);

COMMENT ON TABLE appointments IS '用户预约记录';

-- 防止同一时段重复预约（仅对非 cancelled 状态生效）
CREATE UNIQUE INDEX idx_appointments_slot_unique
  ON appointments (date, start_time)
  WHERE status != 'cancelled';

CREATE INDEX idx_appointments_date ON appointments (date);
CREATE INDEX idx_appointments_status ON appointments (status);
CREATE INDEX idx_appointments_phone ON appointments (customer_phone);

-- ----------------------------------------------------------
-- 6. 管理员表 admin_users
--    使用 Supabase Auth，此表做角色扩展（可选）
-- ----------------------------------------------------------

CREATE TABLE admin_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE admin_users IS '管理员扩展信息，关联 Supabase Auth';

-- ----------------------------------------------------------
-- 7. 自动更新 updated_at 触发器
-- ----------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_services_updated
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------
-- 8. 可用时段查询函数
--    输入日期，返回该日所有可预约时段
-- ----------------------------------------------------------

CREATE OR REPLACE FUNCTION get_available_slots(p_date DATE)
RETURNS TABLE (
  start_time TIME,
  end_time   TIME,
  is_available BOOLEAN
) AS $$
BEGIN
  -- 闭店日直接返回空
  IF EXISTS (
    SELECT 1 FROM special_dates
    WHERE date = p_date AND is_closed = TRUE
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.start_time,
    t.end_time,
    NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.date = p_date
        AND a.start_time = t.start_time
        AND a.status != 'cancelled'
    ) AS is_available
  FROM time_slot_templates t
  WHERE t.is_active = TRUE
    AND (t.day_of_week IS NULL
         OR t.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER)
  ORDER BY t.start_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------
-- 9. Row Level Security (RLS)
-- ----------------------------------------------------------

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slot_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 公开读取：美甲项目
CREATE POLICY "services_public_read"
  ON services FOR SELECT
  USING (is_active = TRUE);

-- 公开读取：时段模板
CREATE POLICY "time_slots_public_read"
  ON time_slot_templates FOR SELECT
  USING (is_active = TRUE);

-- 公开读取：特殊日期
CREATE POLICY "special_dates_public_read"
  ON special_dates FOR SELECT
  USING (TRUE);

-- 公开插入：创建预约（匿名用户）
CREATE POLICY "appointments_public_insert"
  ON appointments FOR INSERT
  WITH CHECK (TRUE);

-- 管理员：全部权限
CREATE POLICY "appointments_admin_all"
  ON appointments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "services_admin_all"
  ON services FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );

CREATE POLICY "admin_users_self_read"
  ON admin_users FOR SELECT
  USING (id = auth.uid());

-- ----------------------------------------------------------
-- 10. 种子数据
-- ----------------------------------------------------------

INSERT INTO services (name, description, price, duration, sort_order) VALUES
  ('纯色美甲',   '经典单色，简约优雅',           88.00,  60, 1),
  ('法式美甲',   '经典法式尖，气质满分',         128.00, 90, 2),
  ('渐变美甲',   '双色/多色渐变，梦幻效果',       158.00, 90, 3),
  ('手绘美甲',   '专属图案手绘，独一无二',        198.00, 120, 4),
  ('光疗延长',   '自然延长，坚固持久',           258.00, 120, 5),
  ('卸甲护理',   '温和卸除 + 指甲护理',           58.00,  30, 6);

-- 默认营业时段：10:00 - 20:00，每 30 分钟
INSERT INTO time_slot_templates (start_time, end_time) VALUES
  ('10:00', '10:30'), ('10:30', '11:00'),
  ('11:00', '11:30'), ('11:30', '12:00'),
  ('12:00', '12:30'), ('12:30', '13:00'),
  ('13:00', '13:30'), ('13:30', '14:00'),
  ('14:00', '14:30'), ('14:30', '15:00'),
  ('15:00', '15:30'), ('15:30', '16:00'),
  ('16:00', '16:30'), ('16:30', '17:00'),
  ('17:00', '17:30'), ('17:30', '18:00'),
  ('18:00', '18:30'), ('18:30', '19:00'),
  ('19:00', '19:30'), ('19:30', '20:00');
