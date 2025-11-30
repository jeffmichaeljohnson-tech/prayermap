# Living Map Quality Gates - Required Tests

## 🚨 MANDATORY: These tests must PASS before any code is deployed

### Test 1: Real-Time Prayer Witnessing
```typescript
test('Users witness prayer activity in real-time', async () => {
  // Setup: Two users on the map simultaneously
  const userA = await openMapIn('Los Angeles');
  const userB = await openMapIn('New York');
  
  // Action: User A posts prayer
  const prayer = await userA.postPrayer('Please pray for my healing');
  
  // Assert: User B sees it within 2 seconds
  await expect(userB.map).toShowNewPrayer(prayer, { timeout: 2000 });
  
  // Assert: Beautiful animation occurs
  await expect(userB.map).toHavePlayedAnimation('prayerAppear');
});
```

### Test 2: Eternal Memorial Lines
```typescript
test('Memorial lines persist forever on map', async () => {
  // Setup: Prayer and response
  const prayer = await postPrayer('Pray for my family');
  const response = await respondToPrayer(prayer.id, 'Praying for you!');
  
  // Assert: Memorial line created immediately
  const line = await getMemorialLine(prayer.id, response.id);
  expect(line).toBeTruthy();
  expect(line.isVisible).toBe(true);
  
  // Assert: Line still exists after app restart
  await restartApp();
  const persistedLine = await getMemorialLine(prayer.id, response.id);
  expect(persistedLine).toBeTruthy();
  expect(persistedLine.isVisible).toBe(true);
  
  // Assert: Line visible to all users
  const newUser = await openMap();
  await expect(newUser.map).toShowMemorialLine(line);
});
```

### Test 3: Universal Shared Map State
```typescript
test('All users see identical map state', async () => {
  // Setup: Multiple users
  const users = await Promise.all([
    openMapIn('Tokyo'),
    openMapIn('London'), 
    openMapIn('Sydney')
  ]);
  
  // Assert: All see same prayers
  const prayers = await users[0].getAllVisiblePrayers();
  for (const user of users) {
    const userPrayers = await user.getAllVisiblePrayers();
    expect(userPrayers).toEqual(prayers);
  }
  
  // Assert: All see same memorial lines
  const connections = await users[0].getAllMemorialLines();
  for (const user of users) {
    const userConnections = await user.getAllMemorialLines();
    expect(userConnections).toEqual(connections);
  }
});
```

### Test 4: Complete Historical Loading
```typescript
test('Map shows ALL historical activity on load', async () => {
  // Setup: Create historical data
  await createHistoricalPrayers(100);
  await createHistoricalConnections(50);
  
  // Action: New user opens map
  const newUser = await openMap();
  
  // Assert: Sees all historical prayers
  const visiblePrayers = await newUser.getAllVisiblePrayers();
  expect(visiblePrayers.length).toBe(100);
  
  // Assert: Sees all historical connections
  const visibleConnections = await newUser.getAllMemorialLines();
  expect(visibleConnections.length).toBe(50);
  
  // Assert: Map feels "alive" with activity
  expect(newUser.getMapDensity()).toBeGreaterThan(0.8);
});
```

### Test 5: Real-Time Response Experience
```typescript
test('Prayer response creates immediate memorial line with animation', async () => {
  // Setup: Prayer exists, two users watching
  const prayer = await createPrayer('Please pray for healing');
  const requester = await openMapAt(prayer.location);
  const observer = await openMapIn('Different City');
  
  // Action: Someone responds to prayer
  const responder = await openMapIn('Third City');
  await responder.respondToPrayer(prayer.id, 'Praying for you!');
  
  // Assert: Memorial line appears for all users within 2 seconds
  const line = await expect(requester.map)
    .toShowMemorialLine({ timeout: 2000 });
  await expect(observer.map)
    .toShowMemorialLine(line, { timeout: 2000 });
  await expect(responder.map)
    .toShowMemorialLine(line, { timeout: 2000 });
    
  // Assert: Beautiful animation played
  await expect(requester.map)
    .toHavePlayedAnimation('memorialLineAppear');
    
  // Assert: Spiritual notification sent
  await expect(requester.notifications)
    .toHaveReceived('Someone prayed for you!');
});
```

## 🚨 DEPLOYMENT BLOCKER

**If ANY of these tests fail, code CANNOT be deployed.**

The Living Map principle is non-negotiable. These tests ensure that the spiritual core of PrayerMap works perfectly.

## Agent Requirements

Every agent must:
1. Run these tests before marking work complete
2. Ensure their changes don't break real-time behavior  
3. Verify memorial lines persist after their changes
4. Test with multiple concurrent users
5. Validate the spiritual experience remains intact