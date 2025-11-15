# PostgreSQL & Supabase Database Documentation

## Overview

This project uses **Supabase** as the backend database platform, which is built on top of **PostgreSQL**. Supabase provides a real-time PostgreSQL database with auto-generated REST APIs, authentication, and storage.

---

## Supabase Connection Details

### Configuration
```javascript
// backend/config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
```

### Environment Variables
```env
SUPABASE_URL=https://chjyfnvwvpbhtlydtcgf.supabase.co
SUPABASE_KEY=your_anon_key_here
```

### Project Details
- **Project URL**: https://chjyfnvwvpbhtlydtcgf.supabase.co
- **Region**: Auto-selected by Supabase
- **Database**: PostgreSQL 15+
- **API**: Auto-generated RESTful API

---

## Database Schema

### 1. working_hubs

**Purpose**: Store co-working hub locations

**Columns**:
```sql
CREATE TABLE working_hubs (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    description TEXT,
    amenities TEXT[],              -- Array of amenities
    contact_email TEXT,
    contact_phone TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes**:
- Primary Key: `id`
- Index on `city` for faster city-based queries

**Sample Data**:
```json
{
    "id": 1,
    "name": "TechHub Mumbai",
    "city": "Mumbai",
    "address": "123 Business District, Mumbai",
    "amenities": ["WiFi", "Parking", "Cafeteria", "Meeting Rooms"],
    "contact_email": "mumbai@techhub.com",
    "contact_phone": "+91-22-12345678"
}
```

---

### 2. workspaces

**Purpose**: Individual bookable spaces within hubs

**Columns**:
```sql
CREATE TABLE workspaces (
    id BIGSERIAL PRIMARY KEY,
    hub_id BIGINT REFERENCES working_hubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,            -- 'private_cabin', 'hot_desk', 'meeting_room', 'conference_room'
    capacity INTEGER NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    amenities TEXT[],
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Foreign Keys**:
- `hub_id` → `working_hubs(id)` (CASCADE DELETE)

**Indexes**:
- Primary Key: `id`
- Foreign Key: `hub_id`
- Index on `type` for filtering
- Index on `is_available` for availability queries

**Constraints**:
- `capacity` must be > 0
- `base_price` must be >= 0
- `type` should be one of: private_cabin, hot_desk, meeting_room, conference_room

**Sample Data**:
```json
{
    "id": 50,
    "hub_id": 1,
    "name": "Executive Suite",
    "type": "private_cabin",
    "capacity": 4,
    "base_price": 2000.00,
    "amenities": ["AC", "WiFi", "Whiteboard"],
    "is_available": true
}
```

---

### 3. resources

**Purpose**: Additional bookable resources (projectors, equipment, etc.)

**Columns**:
```sql
CREATE TABLE resources (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_per_slot DECIMAL(10,2) NOT NULL,
    quantity_available INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Foreign Keys**:
- `workspace_id` → `workspaces(id)` (CASCADE DELETE)

**Indexes**:
- Primary Key: `id`
- Foreign Key: `workspace_id`

**Sample Data**:
```json
{
    "id": 1,
    "workspace_id": 50,
    "name": "Projector",
    "description": "HD Projector with HDMI",
    "price_per_slot": 50.00,
    "quantity_available": 3
}
```

---

### 4. bookings

**Purpose**: Track all workspace reservations

**Columns**:
```sql
CREATE TABLE bookings (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    booking_type TEXT NOT NULL,    -- 'hourly', 'daily', 'monthly'
    total_price DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'confirmed', -- 'confirmed', 'checked_in', 'completed', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_status CHECK (status IN ('confirmed', 'checked_in', 'completed', 'cancelled'))
);
```

**Foreign Keys**:
- `workspace_id` → `workspaces(id)` (CASCADE DELETE)

**Indexes**:
- Primary Key: `id`
- Foreign Key: `workspace_id`
- Index on `user_name` for user bookings lookup
- Index on `status` for filtering active bookings
- Composite index on `(workspace_id, start_time, end_time)` for overlap checks

**Constraints**:
- `end_time` must be greater than `start_time`
- `status` must be one of: confirmed, checked_in, completed, cancelled

**Sample Data**:
```json
{
    "id": 22,
    "workspace_id": 50,
    "user_name": "Bharadwaj",
    "user_email": "bharadwaj@example.com",
    "start_time": "2025-11-17T09:00:00Z",
    "end_time": "2025-11-17T17:00:00Z",
    "booking_type": "hourly",
    "total_price": 10832.80,
    "status": "confirmed"
}
```

---

### 5. booking_resources

**Purpose**: Junction table for many-to-many relationship between bookings and resources

**Columns**:
```sql
CREATE TABLE booking_resources (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
    resource_id BIGINT REFERENCES resources(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_booking_resource UNIQUE(booking_id, resource_id)
);
```

**Foreign Keys**:
- `booking_id` → `bookings(id)` (CASCADE DELETE)
- `resource_id` → `resources(id)` (CASCADE DELETE)

**Indexes**:
- Primary Key: `id`
- Foreign Keys: `booking_id`, `resource_id`
- Unique constraint on `(booking_id, resource_id)`

**Sample Data**:
```json
{
    "id": 1,
    "booking_id": 22,
    "resource_id": 1,
    "quantity": 2
}
```

---

### 6. pricing_rules

**Purpose**: Custom dynamic pricing rules per workspace

**Columns**:
```sql
CREATE TABLE pricing_rules (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    days TEXT[],                   -- ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    start_time TIME,
    end_time TIME,
    percentage_modifier DECIMAL(5,2), -- e.g., 20.00 for 20%
    flat_modifier DECIMAL(10,2),      -- e.g., 500.00 for ₹500
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Foreign Keys**:
- `workspace_id` → `workspaces(id)` (CASCADE DELETE)

**Indexes**:
- Primary Key: `id`
- Foreign Key: `workspace_id`
- Index on `is_active`

**Sample Data**:
```json
{
    "id": 1,
    "workspace_id": 50,
    "name": "Peak Hour Premium",
    "description": "Additional charge during peak hours",
    "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "start_time": "09:00",
    "end_time": "18:00",
    "percentage_modifier": 10.00,
    "is_active": true
}
```

---

### 7. qr_codes

**Purpose**: Store QR codes for booking confirmations

**Columns**:
```sql
CREATE TABLE qr_codes (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
    qr_data TEXT NOT NULL,         -- Base64 encoded QR image
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_booking_qr UNIQUE(booking_id)
);
```

**Foreign Keys**:
- `booking_id` → `bookings(id)` (CASCADE DELETE)

**Indexes**:
- Primary Key: `id`
- Foreign Key: `booking_id`
- Unique constraint on `booking_id`

**Sample Data**:
```json
{
    "id": 1,
    "booking_id": 22,
    "qr_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

---

### 8. time_slots

**Purpose**: Define available time slots for workspaces

**Columns**:
```sql
CREATE TABLE time_slots (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
    day_of_week INTEGER,           -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT DEFAULT 'available', -- 'available', 'booked', 'blocked'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_day CHECK (day_of_week >= 0 AND day_of_week <= 6),
    CONSTRAINT valid_slot_time CHECK (end_time > start_time)
);
```

**Foreign Keys**:
- `workspace_id` → `workspaces(id)` (CASCADE DELETE)

**Indexes**:
- Primary Key: `id`
- Foreign Key: `workspace_id`
- Composite index on `(workspace_id, day_of_week)`

**Constraints**:
- `day_of_week` must be 0-6
- `end_time` must be greater than `start_time`

---

### 9. ratings

**Purpose**: User reviews and ratings for workspaces

**Columns**:
```sql
CREATE TABLE ratings (
    id BIGSERIAL PRIMARY KEY,
    workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5)
);
```

**Foreign Keys**:
- `workspace_id` → `workspaces(id)` (CASCADE DELETE)

**Indexes**:
- Primary Key: `id`
- Foreign Key: `workspace_id`
- Index on `rating` for filtering

**Constraints**:
- `rating` must be between 1 and 5

**Sample Data**:
```json
{
    "id": 1,
    "workspace_id": 50,
    "user_name": "Amit Kumar",
    "rating": 5,
    "review": "Excellent workspace with great amenities!"
}
```

---

## Entity Relationship Diagram (ERD)

```
working_hubs (1) ───── (M) workspaces
                            │
                            ├── (M) resources
                            │
                            ├── (M) bookings ───── (M) booking_resources ───── (M) resources
                            │                 │
                            │                 └── (1) qr_codes
                            │
                            ├── (M) pricing_rules
                            │
                            ├── (M) time_slots
                            │
                            └── (M) ratings
```

**Relationships**:
- 1 Hub → Many Workspaces (1:M)
- 1 Workspace → Many Resources (1:M)
- 1 Workspace → Many Bookings (1:M)
- 1 Workspace → Many Pricing Rules (1:M)
- 1 Workspace → Many Time Slots (1:M)







- 1 Workspace → Many Ratings (1:M)
- 1 Booking → 1 QR Code (1:1)
- Bookings ↔ Resources (M:M via booking_resources)

---

## PostgreSQL Features Used

### 1. Data Types

**BIGSERIAL**
- Auto-incrementing 64-bit integer
- Used for all primary keys
- Range: 1 to 9,223,372,036,854,775,807

**TEXT**
- Variable-length string (unlimited length)
- Used for names, descriptions, reviews

**DECIMAL(10,2)**
- Fixed-point number with precision
- 10 total digits, 2 after decimal point
- Used for prices (e.g., 12345678.99)

**INTEGER**
- 32-bit signed integer
- Used for capacity, quantity, rating

**BOOLEAN**
- True/False values
- Used for is_available, is_active

**TIMESTAMPTZ**
- Timestamp with timezone
- Automatically converts to UTC
- Used for created_at, updated_at, booking times

**TIME**
- Time of day (no date)
- Used for slot start/end times

**TEXT[]**
- Array of text values
- Used for amenities, days

### 2. Constraints

**PRIMARY KEY**
```sql
id BIGSERIAL PRIMARY KEY
```

**FOREIGN KEY with CASCADE**
```sql
workspace_id BIGINT REFERENCES workspaces(id) ON DELETE CASCADE
```
- When parent row deleted, child rows automatically deleted

**UNIQUE**
```sql
CONSTRAINT unique_booking_qr UNIQUE(booking_id)
```

**CHECK**
```sql
CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5)
CONSTRAINT valid_time_range CHECK (end_time > start_time)
```

**DEFAULT**
```sql
created_at TIMESTAMPTZ DEFAULT NOW()
is_available BOOLEAN DEFAULT TRUE
```

### 3. Indexes

**Automatic Indexes** (created by PostgreSQL):
- Primary keys
- Unique constraints
- Foreign keys

**Custom Indexes** (recommended):
```sql
CREATE INDEX idx_workspaces_hub_id ON workspaces(hub_id);
CREATE INDEX idx_workspaces_type ON workspaces(type);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_workspace_time ON bookings(workspace_id, start_time, end_time);
```

### 4. Functions & Triggers

**Auto-update updated_at**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workspaces_updated_at 
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Supabase Client Usage Examples

### 1. Simple SELECT Query
```javascript
const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('hub_id', 1);
```

### 2. SELECT with JOIN
```javascript
const { data, error } = await supabase
    .from('workspaces')
    .select(`
        *,
        working_hubs (
            name,
            city
        )
    `)
    .eq('is_available', true);
```

### 3. INSERT
```javascript
const { data, error } = await supabase
    .from('bookings')
    .insert({
        workspace_id: 50,
        user_name: 'John Doe',
        start_time: '2025-11-18T10:00:00',
        end_time: '2025-11-18T14:00:00',
        booking_type: 'hourly',
        total_price: 10832.80,
        status: 'confirmed'
    })
    .select()
    .single();
```

### 4. UPDATE
```javascript
const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', 22)
    .select();
```

### 5. DELETE
```javascript
const { data, error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', 22);
```

### 6. Complex Query with Filters
```javascript
const { data, error } = await supabase
    .from('bookings')
    .select('workspace_id, workspaces!inner(hub_id)')
    .eq('workspaces.hub_id', 1)
    .in('status', ['confirmed', 'checked_in'])
    .lte('start_time', '2025-11-18T14:00:00')
    .gte('end_time', '2025-11-18T10:00:00');
```

### 7. Aggregate Functions
```javascript
// Count bookings
const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', 50);

// Average rating
const { data, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('workspace_id', 50);

const avgRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
```

### 8. Real-time Subscriptions
```javascript
const subscription = supabase
    .channel('bookings_channel')
    .on('postgres_changes', 
        { 
            event: '*', 
            schema: 'public', 
            table: 'bookings' 
        }, 
        (payload) => {
            console.log('Booking changed:', payload);
        }
    )
    .subscribe();
```

---

## Query Optimization Tips

### 1. Use Indexes
```sql
-- Check if index exists
SELECT * FROM pg_indexes WHERE tablename = 'bookings';

-- Create composite index for common query
CREATE INDEX idx_bookings_workspace_status 
ON bookings(workspace_id, status) 
WHERE status IN ('confirmed', 'checked_in');
```

### 2. Use EXPLAIN ANALYZE
```sql
EXPLAIN ANALYZE
SELECT * FROM bookings 
WHERE workspace_id = 50 
AND status = 'confirmed';
```

### 3. Limit Results
```javascript
const { data } = await supabase
    .from('workspaces')
    .select('*')
    .limit(20);
```

### 4. Select Specific Columns
```javascript
// Bad: SELECT *
const { data } = await supabase
    .from('workspaces')
    .select('*');

// Good: SELECT only needed columns
const { data } = await supabase
    .from('workspaces')
    .select('id, name, base_price');
```

### 5. Use Connection Pooling
Supabase automatically uses PgBouncer for connection pooling.

---

## Data Validation

### Backend Validation (Node.js)
```javascript
// Validate booking time range
if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({
        success: false,
        error: 'End time must be after start time'
    });
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(user_email)) {
    return res.status(400).json({
        success: false,
        error: 'Invalid email format'
    });
}

// Validate rating range
if (rating < 1 || rating > 5) {
    return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
    });
}
```

### Database Constraints
```sql
-- Ensure rating is 1-5
CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5)

-- Ensure capacity is positive
CONSTRAINT positive_capacity CHECK (capacity > 0)

-- Ensure valid booking status
CONSTRAINT valid_status CHECK (status IN ('confirmed', 'checked_in', 'completed', 'cancelled'))
```

---

## Backup & Recovery

### Supabase Automatic Backups
- **Daily backups** retained for 7 days (Free tier)
- Point-in-time recovery available (Paid plans)
- Download backups from Supabase Dashboard

### Manual Backup
```bash
# Using pg_dump (requires direct PostgreSQL access)
pg_dump -h db.chjyfnvwvpbhtlydtcgf.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -f backup.dump
```

### Restore from Backup
```bash
pg_restore -h db.chjyfnvwvpbhtlydtcgf.supabase.co \
           -U postgres \
           -d postgres \
           -c \
           backup.dump
```

---

## Security Best Practices

### 1. Row Level Security (RLS)
```sql
-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own bookings
CREATE POLICY user_bookings_policy ON bookings
FOR SELECT
USING (user_email = auth.email());
```

### 2. API Key Management
- **Anon Key**: Safe for client-side use (limited permissions)
- **Service Role Key**: Full access (never expose to client)
- Store keys in `.env` file
- Add `.env` to `.gitignore`

### 3. Input Sanitization
```javascript
// Prevent SQL injection (Supabase client does this automatically)
const { data } = await supabase
    .from('workspaces')
    .select('*')
    .eq('name', userInput); // Safe - parameterized query
```

### 4. Rate Limiting
```javascript
// Implement rate limiting on API routes
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Performance Monitoring

### Supabase Dashboard
- **Database Health**: CPU, Memory, Disk usage
- **Query Performance**: Slow query log
- **Active Connections**: Monitor connection pool

### Query Statistics
```sql
-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- View table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Migration Strategy

### Version Control Migrations
```javascript
// migrations/001_create_initial_tables.sql
CREATE TABLE working_hubs (...);
CREATE TABLE workspaces (...);

// migrations/002_add_ratings_table.sql
CREATE TABLE ratings (...);

// Run migrations in order
// Use tools like: node-pg-migrate, knex, or custom scripts
```

### Supabase Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Init migrations
supabase init

# Create new migration
supabase migration new add_ratings_table

# Apply migrations
supabase db push
```

---

## Common Queries

### 1. Check Workspace Availability
```javascript
const { data: overlappingBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('status', ['confirmed', 'checked_in'])
    .lte('start_time', requestedEndTime)
    .gte('end_time', requestedStartTime);

const isAvailable = overlappingBookings.length === 0;
```

### 2. Calculate Hub Occupancy
```javascript
// Get total workspaces in hub
const { data: allWorkspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('hub_id', hubId)
    .eq('is_available', true);

// Get booked workspaces during time range
const { data: bookedWorkspaces } = await supabase
    .from('bookings')
    .select('workspace_id, workspaces!inner(hub_id)')
    .eq('workspaces.hub_id', hubId)
    .in('status', ['confirmed', 'checked_in'])
    .lte('start_time', endTime)
    .gte('end_time', startTime);

const occupancyRate = (bookedWorkspaces.length / allWorkspaces.length) * 100;
```

### 3. Get User's Booking History
```javascript
const { data: bookings } = await supabase
    .from('bookings')
    .select(`
        *,
        workspaces (
            name,
            type,
            working_hubs (
                name,
                city
            )
        )
    `)
    .eq('user_name', userName)
    .order('created_at', { ascending: false });
```

### 4. Get Top Rated Workspaces
```javascript
const { data: ratings } = await supabase
    .from('ratings')
    .select('workspace_id, rating');

// Group by workspace and calculate average
const avgRatings = ratings.reduce((acc, r) => {
    if (!acc[r.workspace_id]) {
        acc[r.workspace_id] = { sum: 0, count: 0 };
    }
    acc[r.workspace_id].sum += r.rating;
    acc[r.workspace_id].count += 1;
    return acc;
}, {});

// Sort by average rating
const topWorkspaces = Object.entries(avgRatings)
    .map(([id, { sum, count }]) => ({ id, avg: sum / count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);
```

---

## Troubleshooting

### Common Issues

**1. Connection Timeout**
```
Error: connect ETIMEDOUT
```
**Solution**: Check firewall, verify Supabase URL, check network connection

**2. Foreign Key Violation**
```
Error: insert or update on table violates foreign key constraint
```
**Solution**: Ensure referenced record exists before inserting

**3. Unique Constraint Violation**
```
Error: duplicate key value violates unique constraint
```
**Solution**: Check for existing records before inserting

**4. Type Mismatch**
```
Error: invalid input syntax for type timestamp
```
**Solution**: Ensure datetime strings are in ISO 8601 format

### Debug Queries
```javascript
// Enable query logging in Supabase client
const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', 22);

if (error) {
    console.error('Supabase error:', error);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
}
```

---

## Summary

This project uses **PostgreSQL via Supabase** with:

✅ **9 tables** with proper relationships and constraints  
✅ **Foreign keys** with CASCADE DELETE for data integrity  
✅ **Indexes** for query performance  
✅ **Check constraints** for data validation  
✅ **Timestamps** for audit trails  
✅ **Arrays** for multi-value fields (amenities, days)  
✅ **DECIMAL** for precise price calculations  
✅ **Auto-generated REST API** via Supabase  
✅ **Real-time subscriptions** capability  
✅ **Automatic backups** and point-in-time recovery  

The database schema supports a full-featured co-working space platform with dynamic pricing, resource management, booking system, and user ratings.
