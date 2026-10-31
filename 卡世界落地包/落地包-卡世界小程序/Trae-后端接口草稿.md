# Trae · 卡世界后端接口草稿（Stub）

范围：微信小程序卡世界玩法所需最小 API。  
原则：**同城确定性发放**；**无随机开包 / 随机 pack 端点**；蜂蜜不可充值购买随机机会。

约定：JSON；鉴权沿用现有小程序登录态（`openid` / 球员绑定）；路径前缀示意 `/api/card-world/`（可改为云函数 action 名）。

---

## 0. 通用约定

- 所有「签约」结果在**相同规则 + 相同输入**下可复现；实现时**禁止** `Math.random` / 随机种子决定发放对象。
- 建议匹配键：`cityCode + 标签过滤 + 用户已拥有集合 + 日序/轮转游标`（示例；以可审计文档为准）。
- 错误码建议：`QUOTA_EXCEEDED`、`NOT_SAME_CITY`、`ROSTER_LOCKED`、`LINEUP_INVALID`、`MINOR_NO_AUTORENEW`。

---

## 1. GET 主卡

`GET /api/card-world/main-card`

**响应示例**

```json
{
  "playerId": "p_10086",
  "name": "铁栋泽",
  "nameEn": "TIE D.Z.",
  "position": "FW",
  "number": 10,
  "cardImageUrl": "https://…/tie-dongze-card.png",
  "stats": { "appearances": 12, "goals": 5, "assists": 3 },
  "growthMarks": ["week-border-1", "sticker-debut"],
  "portraitAuthorized": true,
  "cityCode": "330100"
}
```

---

## 2. GET 卡册

`GET /api/card-world/album`

**响应示例**

```json
{
  "mainCardId": "p_10086",
  "cards": [
    { "cardId": "c_1", "playerId": "p_10086", "isMain": true, "name": "铁栋泽", "ovr": 86, "position": "FW" },
    { "cardId": "c_2", "playerId": "p_20001", "isMain": false, "name": "…", "ovr": 78, "position": "CB", "source": "sign_same_city" }
  ],
  "signQuota": { "dailyFreeLeft": 1, "dailyFreeTotal": 1, "定向Left": 0 }
}
```

---

## 3. POST 同城签约（确定性）

`POST /api/card-world/sign-same-city`

**请求**

```json
{
  "mode": "free_daily",
  "filter": { "position": null, "skillTag": null }
}
```

- `mode`: `free_daily` | `定向_position` | `定向_skill` | `member_extra`
- `filter`：定向签约时必填对应标签；免费日签一般为全同城池规则。

**响应**

```json
{
  "ok": true,
  "card": { "cardId": "c_9", "playerId": "p_20009", "name": "…", "position": "CB", "cityCode": "330100" },
  "signQuota": { "dailyFreeLeft": 0, "定向Left": 0 },
  "deterministicKey": "sc:330100:2026-10-31:p_10086:cursor:14"
}
```

**规则**

- 仅从**同城**且满足标签的球员库按规则取下一位；跳过已拥有。
- 扣减对应配额；不足返回 `QUOTA_EXCEEDED`。
- **不要**提供 `/pack/open`、`/gacha`、`/draw` 之类随机端点。

---

## 4. GET / POST 阵容

`GET /api/card-world/lineup?rosterSize=5`

`POST /api/card-world/lineup`

**POST 请求**

```json
{
  "rosterSize": 5,
  "slots": [
    { "slot": "GK", "cardId": "c_3" },
    { "slot": "DF", "cardId": "c_2" },
    { "slot": "MF", "cardId": "c_4" },
    { "slot": "MF", "cardId": "c_5" },
    { "slot": "FW", "cardId": "c_1" }
  ]
}
```

- `rosterSize`: `5` 免费；`8` / `11` 需用户已解锁对应编制，否则 `ROSTER_LOCKED`。
- 校验：人数、必含门将（按赛制）、卡归属本人卡册。

---

## 5. POST 轻对战

`POST /api/card-world/battle`

**请求**

```json
{
  "mode": "newbie_5v5",
  "myLineupId": "lu_1",
  "opponent": { "type": "share_challenge", "shareId": "sh_abc" }
}
```

`opponent.type`: `weekly_theme` | `share_challenge` | `system_bot`（示例）。

**响应**

```json
{
  "battleId": "b_1001",
  "scoreMine": 3,
  "scoreOpp": 2,
  "result": "win",
  "comment": "前场压制奏效",
  "badges": ["light-challenge"],
  "deterministicKey": "bt:lu_1:sh_abc:rule_v1"
}
```

- 评分：综合分 + 位置契合等；**同一输入结果唯一**；不因会员 / 付费改胜负权重。
- 新手场不上硬榜。

---

## 6. GET 战报

`GET /api/card-world/battle-log?limit=20&cursor=`

**响应**

```json
{
  "items": [
    {
      "battleId": "b_1001",
      "playedAt": "2026-10-31T10:00:00+08:00",
      "mode": "newbie_5v5",
      "scoreMine": 3,
      "scoreOpp": 2,
      "result": "win",
      "opponentLabel": "分享挑战"
    }
  ],
  "nextCursor": null
}
```

---

## 7. 会员与每日签约配额

`GET /api/card-world/membership`

`POST /api/card-world/membership/grant-daily-sign-quota`（可由定时任务 / 登录时服务端内部调用；若对外暴露须鉴权）

**会员响应示例**

```json
{
  "tier": "none",
  "dailySignQuota": 1,
  "rosterUnlocks": { "size8": false, "size11": false },
  "autoRenew": false,
  "isMinor": true
}
```

**规则**

- 会员提升的是**确定性签约日次数**（及编制权益），不是概率。
- `isMinor === true` 时：**禁止**开启 `autoRenew`；接口拒绝设置自动续费并返回 `MINOR_NO_AUTORENEW`。
- 蜂蜜：若保留积分账户，仅任务/签到/活动发放；**无 RMB 充值接口**；可兑定向签约次数，不可兑随机机会。

---

## 8. 编制解锁（付费，确定性）

`POST /api/card-world/roster-unlock`

```json
{ "size": 8 }
```

`size`: `8`（社区）| `11`（城市）。支付走现有微信虚拟支付 / 服务类目方案；本 stub 只记解锁态。

---

## 9. 明确不实现

| 不要做的端点 | 原因 |
| --- | --- |
| `POST …/pack/open`、`/gacha`、`/draw` | 产品已取消随机开包 |
| `POST …/honey/recharge` | 无蜂蜜人民币充值 |
| 卡交易 / 赠送变现 | 红线 |
| 按付费加权胜负 | 红线 |

---

## 10. 建议落地顺序

1. main-card + album 只读  
2. sign-same-city（先做免费日签确定性）  
3. lineup GET/POST（rosterSize=5）  
4. battle + battle-log  
5. membership 配额与 8/11 解锁  
6. 定向签约 filter + 蜂蜜兑次数（若需要）
