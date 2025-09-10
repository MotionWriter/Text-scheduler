# API Endpoints Documentation

## Base URL
- **Development**: `https://scrupulous-wren-82.convex.site`
- **Production**: `https://tidy-peccary-949.convex.site`

## Authentication
All endpoints require an API key in the Authorization header:
```
Authorization: Bearer sk_your_api_key_here
```

---

## GET /api/messages/pending

Fetch pending messages scheduled for today (or all pending messages).

### Parameters (Query String)
- `todayOnly` (optional): `true` (default) | `false` - Filter to today's messages only
- `groupOnly` (optional): `true` | `false` (default) - Return only group messages
- `category` (optional): string - Filter by message category

### Request Example
```bash
curl -X GET "https://scrupulous-wren-82.convex.site/api/messages/pending?groupOnly=true" \
  -H "Authorization: Bearer sk_vlBXNmKrQhiyUC7pMfFVVOSwBPPhn9ie" \
  -H "Content-Type: application/json"
```

### Response Example
```json
{
  "messages": [
    {
      "id": "agg:kn7ezbzbbeggwb2wa4v4kzw04s7q6f9j:1757331000000:1647952218",
      "message": "Testing that this will add a new person.",
      "contact": {
        "name": "Room 313A",
        "phoneNumber": "214-793-4649,555-123-4567,555-765-4321"
      },
      "group": {
        "name": "Room 313A",
        "color": "#EF4444"
      },
      "scheduledFor": 1757331000000,
      "scheduledForIso": "2025-09-08T16:10:00.000Z",
      "category": "study",
      "messageIds": ["k9715nspjenbxhk03y3nt961gd7q6ncd", "k971xd5x9cxvs6skr7ycnd1ees7q6a4v"]
    }
  ],
  "count": 1,
  "serverNow": 1757384195028,
  "serverNowIso": "2025-09-09T02:16:35.028Z",
  "todayOnly": true,
  "startOfDay": 1757376000000,
  "startOfDayIso": "2025-09-09T00:00:00.000Z",
  "endOfDay": 1757462400000,
  "endOfDayIso": "2025-09-10T00:00:00.000Z",
  "groupOnly": false,
  "timezoneOffsetMinutes": 0,
  "verifiedOnFirstUse": false
}
```

---

## POST /api/messages/sent

Mark message(s) as successfully sent.

### Request Body (Multiple Messages)
```json
{
  "sentAt": "2025-09-09T02:16:35.000Z",
  "messageIds": ["k9715nspjenbxhk03y3nt961gd7q6ncd", "k971xd5x9cxvs6skr7ycnd1ees7q6a4v"]
}
```

### Request Body (Single Message)
```json
{
  "sentAt": "2025-09-09T02:16:35.000Z",
  "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd"
}
```

### Request Body (Unix Timestamp - Backwards Compatible)
```json
{
  "sentAt": 1757384195000,
  "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd"
}
```

### Parameters
- **`sentAt`** (required): Timestamp when message was sent
  - **ISO 8601 string**: `"2025-09-09T02:16:35.000Z"` (recommended for Apple Shortcuts)
  - **Unix timestamp**: `1757384195000` (milliseconds since epoch)
- **`messageId`** OR **`messageIds`** (required): Message ID(s) to mark as sent

### Request Example
```bash
curl -X POST "https://scrupulous-wren-82.convex.site/api/messages/sent" \
  -H "Authorization: Bearer sk_vlBXNmKrQhiyUC7pMfFVVOSwBPPhn9ie" \
  -H "Content-Type: application/json" \
  -d '{
    "sentAt": "2025-09-09T02:16:35.000Z",
    "messageIds": ["k97739m9h0sqgv2gxq92krhqx57q68zm", "k979gqeek2bzrgr6py1xtx7pbn7q7fvc"]
  }'
```

### Response Example
```json
{
  "success": true
}
```

### Error Response Example
```json
{
  "error": "Invalid sentAt format: Error: Invalid timestamp format: invalid-timestamp"
}
```

---

## POST /api/messages/failed

Mark message(s) as failed to send.

### Request Body (Multiple Messages)
```json
{
  "messageIds": ["k9715nspjenbxhk03y3nt961gd7q6ncd", "k971xd5x9cxvs6skr7ycnd1ees7q6a4v"],
  "error": "SMS delivery failed: Network timeout"
}
```

### Request Body (Single Message)
```json
{
  "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd",
  "error": "Invalid phone number format"
}
```

### Parameters
- **`messageId`** OR **`messageIds`** (required): Message ID(s) to mark as failed
- **`error`** (optional): Error message describing the failure

### Request Example
```bash
curl -X POST "https://scrupulous-wren-82.convex.site/api/messages/failed" \
  -H "Authorization: Bearer sk_vlBXNmKrQhiyUC7pMfFVVOSwBPPhn9ie" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd",
    "error": "SMS delivery failed"
  }'
```

### Response Example
```json
{
  "success": true
}
```

---

## GET /api/study-messages/pending

Fetch pending study book messages for delivery.

### Parameters (Query String)
- `limit` (optional): number - Maximum messages to return (default: 50)
- `startOfDay` (optional): number - Unix timestamp for start of day filter

### Request Example
```bash
curl -X GET "https://scrupulous-wren-82.convex.site/api/study-messages/pending?limit=10" \
  -H "Authorization: Bearer sk_vlBXNmKrQhiyUC7pMfFVVOSwBPPhn9ie" \
  -H "Content-Type: application/json"
```

### Response Example
```json
{
  "messages": [
    {
      "id": "k97739m9h0sqgv2gxq92krhqx57q68zm",
      "content": "Today's study message content",
      "scheduledAt": 1757331000000,
      "scheduledAtIso": "2025-09-08T16:10:00.000Z",
      "lessonId": "kd73c52egeyj7q3n0gkqnxatf57q0ram",
      "userId": "kd73c52egeyj7q3n0gkqnxatf57q0ram"
    }
  ],
  "count": 1,
  "serverNow": 1757384195028,
  "serverNowIso": "2025-09-09T02:16:35.028Z",
  "timezoneOffsetMinutes": 0
}
```

---

## POST /api/study-messages/delivered

Mark study message(s) as successfully delivered.

### Request Body (Multiple Messages)
```json
{
  "deliveredAt": "2025-09-09T02:16:35.000Z",
  "messageIds": ["k9715nspjenbxhk03y3nt961gd7q6ncd", "k971xd5x9cxvs6skr7ycnd1ees7q6a4v"],
  "externalMessageId": "sms_123456789"
}
```

### Request Body (Single Message)
```json
{
  "deliveredAt": "2025-09-09T02:16:35.000Z",
  "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd",
  "externalMessageId": "sms_123456789"
}
```

### Parameters
- **`deliveredAt`** (required): Timestamp when message was delivered
  - **ISO 8601 string**: `"2025-09-09T02:16:35.000Z"`
  - **Unix timestamp**: `1757384195000`
- **`messageId`** OR **`messageIds`** (required): Message ID(s) to mark as delivered
- **`externalMessageId`** (optional): External system's message ID for tracking

### Request Example
```bash
curl -X POST "https://scrupulous-wren-82.convex.site/api/study-messages/delivered" \
  -H "Authorization: Bearer sk_vlBXNmKrQhiyUC7pMfFVVOSwBPPhn9ie" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveredAt": "2025-09-09T02:16:35.000Z",
    "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd",
    "externalMessageId": "sms_123456789"
  }'
```

### Response Example
```json
{
  "success": true,
  "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd",
  "deliveredAt": 1757384195000
}
```

---

## POST /api/study-messages/failed

Mark study message(s) as failed to deliver.

### Request Body (Multiple Messages)
```json
{
  "messageIds": ["k9715nspjenbxhk03y3nt961gd7q6ncd", "k971xd5x9cxvs6skr7ycnd1ees7q6a4v"],
  "error": "SMS delivery failed: Network timeout",
  "failedAt": "2025-09-09T02:16:35.000Z"
}
```

### Request Body (Single Message)
```json
{
  "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd",
  "error": "Invalid phone number format",
  "failedAt": "2025-09-09T02:16:35.000Z"
}
```

### Parameters
- **`messageId`** OR **`messageIds`** (required): Message ID(s) to mark as failed
- **`error`** (optional): Error message describing the failure (default: "Delivery failed")
- **`failedAt`** (optional): Timestamp when failure occurred (defaults to current time)
  - **ISO 8601 string**: `"2025-09-09T02:16:35.000Z"`
  - **Unix timestamp**: `1757384195000`

### Request Example
```bash
curl -X POST "https://scrupulous-wren-82.convex.site/api/study-messages/failed" \
  -H "Authorization: Bearer sk_vlBXNmKrQhiyUC7pMfFVVOSwBPPhn9ie" \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd",
    "error": "SMS delivery failed",
    "failedAt": "2025-09-09T02:16:35.000Z"
  }'
```

### Response Example
```json
{
  "success": true,
  "messageId": "k9715nspjenbxhk03y3nt961gd7q6ncd",
  "error": "SMS delivery failed"
}
```

---

## GET /api/study-messages/stats

Get delivery statistics for study messages.

### Parameters (Query String)
- `timeRange` (optional): number - Time range in hours to analyze (default: 24)

### Request Example
```bash
curl -X GET "https://scrupulous-wren-82.convex.site/api/study-messages/stats?timeRange=48" \
  -H "Authorization: Bearer sk_vlBXNmKrQhiyUC7pMfFVVOSwBPPhn9ie" \
  -H "Content-Type: application/json"
```

### Response Example
```json
{
  "totalMessages": 150,
  "delivered": 142,
  "failed": 8,
  "pending": 0,
  "deliveryRate": 94.67,
  "timeRangeHours": 48,
  "timestamp": 1757384195028
}
```

---

## GET /api/verify

Verify API key and mark user as verified (for Apple Shortcut setup).

### Request Example
```bash
curl -X GET "https://scrupulous-wren-82.convex.site/api/verify" \
  -H "Authorization: Bearer sk_vlBXNmKrQhiyUC7pMfFVVOSwBPPhn9ie" \
  -H "Content-Type: application/json"
```

### Response Example
```json
{
  "success": true,
  "message": "Apple Shortcut verification successful! Your account is now activated.",
  "userId": "kd73c52egeyj7q3n0gkqnxatf57q0ram"
}
```

---

## Common Error Responses

### Authentication Errors
```json
{
  "error": "API key required"
}
```

```json
{
  "error": "Invalid API key"
}
```

```json
{
  "error": "API key expired (grace period ended)"
}
```

### Validation Errors
```json
{
  "error": "messageId or messageIds and sentAt are required"
}
```

```json
{
  "error": "Invalid sentAt format: Error: Invalid timestamp format: invalid-timestamp"
}
```

### Server Errors
```json
{
  "error": "Internal server error"
}
```

---

## Apple Shortcuts Integration

For Apple Shortcuts, use the **ISO 8601 timestamp format**:

1. Use the "Format Date" action
2. Select "ISO 8601" from the format dropdown
3. Use the formatted date as the `sentAt`, `deliveredAt`, or `failedAt` value

Example Shortcut flow:
```
Get Current Date → Format Date (ISO 8601) → Get Contents of URL (POST /api/messages/sent)
```

---

## Logging

The `/api/messages/sent` endpoint includes comprehensive logging that captures:
- Request timestamp and headers
- Full request body
- Parameter parsing and validation
- Timestamp format conversion
- Authentication status
- Database operations
- Success/error details

Check your Convex dashboard logs for detailed request tracking.