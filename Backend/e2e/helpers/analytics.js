export async function openForecastDetails(page) {
  const forecast = page.getByRole('region', { name: 'Estimated Collections', exact: true });
  await forecast.waitFor({ state: 'visible' });
  const button = forecast.getByRole('button', { name: 'How this is calculated', exact: true });
  if (await button.count()) {
    await button.click();
    return page.getByRole('dialog', { name: 'Collection forecast details', exact: true });
  }
  await forecast.getByText('How this is calculated', { exact: true }).click();
  return forecast;
}
