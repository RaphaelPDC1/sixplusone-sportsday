SELECT 
  COUNT(*) as total_unpaid,
  team,
  COUNT(*) as team_count
FROM sports_day_registrations
WHERE paymentStatus = 'unpaid'
GROUP BY team
ORDER BY team_count DESC;
