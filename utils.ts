const cheerio = require('cheerio');

async function getCoordsFromName(place) {
	const url =
		`https://nominatim.openstreetmap.org/search` +
		`?q=${encodeURIComponent(place)}` +
		`&limit=1&format=json&addressdetails=1`;
	const res = await fetch(url, {
		headers: { 'User-Agent': 'TelegramBot/1.0' },
	});
	const js = await res.json();
	if (!js.length) return null;
	return [parseFloat(js[0].lon), parseFloat(js[0].lat)];
}

async function fetchFuelPrices(cityCode) {
	const body = `template=1&cityId=${cityCode}&districtId=`;
	const res = await fetch('your_fuel_api_address', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	});
	const html = await res.text();
	const $ = cheerio.load(html);

	const $row = $('tbody tr').first();
	const benz = parseFloat(
		$row.find('td').eq(1).find('span').first().text().replace(',', '.')
	);
	const dizel = parseFloat(
		$row.find('td').eq(2).find('span').first().text().replace(',', '.')
	);
	const lpg = parseFloat(
		$row.find('td').eq(-1).find('span').first().text().replace(',', '.')
	);

	return { benz, dizel, lpg };
}

function getDirectionEmoji(mod, type) {
	mod = (mod || '').toLowerCase();
	type = (type || '').toLowerCase();
	if (type === 'uturn') return '🔄 U dönüşü';
	if (mod.includes('right')) return '➡️ Sağa dön';
	if (mod.includes('left')) return '⬅️ Sola dön';
	if (mod.includes('straight')) return '⬆️ Düz git';
	if (type === 'roundabout') return '⭕ Ada dönüşü';
	return '⬆️ Düz git';
}

module.exports = { getCoordsFromName, fetchFuelPrices, getDirectionEmoji };
