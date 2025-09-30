const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');
const cityPlates = require('./data');
const {
	getCoordsFromName,
	fetchFuelPrices,
	getDirectionEmoji,
} = require('./utils');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/^\/yoltarifi (.+) dan (.+)$/i, async (msg, match) => {
	const chatId = msg.chat.id;
	let [, fromPlace, toPlace] = match.map((s) => s.trim());
	console.log(fromPlace, toPlace);

	if (!fromPlace || !toPlace) {
		return bot.sendMessage(
			chatId,
			'⚠️ Lütfen `/yoltarifi [başlangıç] dan [varış]` şeklinde yazın.',
			{ parse_mode: 'Markdown' }
		);
	}

	// İlçe adlarını dışlayarak sadece şehir adı ile eşleşme yapıyoruz.
	fromPlace = fromPlace.split(',')[1] || fromPlace; // "Nilüfer, Bursa" -> "Bursa"
	toPlace = toPlace.split(',')[1] || toPlace; // "Kadıköy, İstanbul" -> "İstanbul"

	// Şehir kodu ile eşleşme yapıyoruz.
	const cityObj = cityPlates.find(
		(c) => fromPlace.toLowerCase().includes(c.name.toLowerCase()) // Şehir ismi içeriyor mu?
	);

	try {
		const startCoords = await getCoordsFromName(fromPlace);
		if (!startCoords) {
			return bot.sendMessage(chatId, `📍 Konum bulunamadı: ${fromPlace}`);
		}

		const cityInfo =
			(
				await fetch(
					`https://nominatim.openstreetmap.org/search` +
						`?q=${encodeURIComponent(fromPlace)}` +
						`&limit=1&format=json&addressdetails=1`,
					{ headers: { 'User-Agent': 'TelegramBot/1.0' } }
				).then((r) => r.json())
			)[0]?.address || {};
		if (!toPlace.includes(',') && cityInfo.city) {
			toPlace += `, ${cityInfo.city}`;
		}

		const endCoords = await getCoordsFromName(toPlace);
		if (!endCoords) {
			return bot.sendMessage(chatId, `📍 Konum bulunamadı: ${toPlace}`);
		}

		const routeRes = await fetch(
			`https://router.project-osrm.org/route/v1/driving/` +
				`${startCoords[0]},${startCoords[1]};` +
				`${endCoords[0]},${endCoords[1]}` +
				`?overview=full&geometries=geojson&steps=true`
		);
		const routeJson = await routeRes.json();
		if (!routeJson.routes?.length) {
			return bot.sendMessage(chatId, '🚫 Rota bulunamadı');
		}

		const route = routeJson.routes[0];
		const distanceKm = +(route.distance / 1000).toFixed(1);
		const durationMin = Math.round(route.duration / 60);
		const eta = moment().add(durationMin, 'dakika').format('HH:mm');

		let msgText;
		console.log(cityObj);
		if (cityObj) {
			const prices = await fetchFuelPrices(cityObj.code);

			const fuelLt = +((distanceKm * 7) / 100).toFixed(2);
			const fuelTl = Math.round(fuelLt * prices.benz);
			const lpgLt = +(fuelLt * 1.2).toFixed(2);
			const lpgTl = Math.round(lpgLt * prices.lpg);

			msgText =
				`🗺 *Rota Özeti*\n\n` +
				`📏 Mesafe: *${distanceKm}* km\n` +
				`⏱ Süre: *${durationMin}* dk\n` +
				`📆 Varış: *${eta}*\n\n` +
				`⛽ Benzin: ${fuelLt} lt (~${fuelTl} TL @ ${prices.benz} TL)\n` +
				`⛽ Dizel: ${fuelLt} lt (~${fuelTl} TL @ ${prices.dizel} TL)\n` +
				`⛽ LPG:     ${lpgLt} lt (~${lpgTl} TL @ ${prices.lpg} TL)\n\n` +
				`*Adımlar:*\n`;
		} else {
			msgText =
				`🗺 *Rota Özeti*\n\n` +
				`📏 Mesafe: *${distanceKm}* km\n` +
				`⏱ Süre: *${durationMin}* dk\n` +
				`📆 Varış: *${eta}*\n\n`;
		}

		route.legs[0].steps.forEach((step, i) => {
			const dir = getDirectionEmoji(step.maneuver.modifier, step.maneuver.type);
			const road = step.name?.trim() || 'İsimsiz yol';
			const dist = (step.distance / 1000).toFixed(2) + ' km';
			const dur =
				step.duration < 60
					? `${Math.ceil(step.duration)} sn`
					: `${Math.round(step.duration / 60)} dk`;
			msgText += `${i + 1}. ${dir} | ${road} (${dist}, ${dur})\n`;
		});

		await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
	} catch (e) {
		console.error(e);
		bot.sendMessage(chatId, '❗ Bir hata oluştu, lütfen tekrar deneyin.');
	}
});

bot.onText(/^\/havadurumu (.+)$/i, async (msg, match) => {
	const chatId = msg.chat.id;
	try {
		const currentLocation = await getCoordsFromName(match[1]);

		const response = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${currentLocation[0]}&longitude=${currentLocation[1]}&daily=sunrise,sunset&current=is_day,temperature_2m,precipitation&timezone=auto&forecast_days=1`
		);
		const data = await response.json();

		const { time, is_day, temperature_2m, precipitation } = data.current;
		const { sunrise, sunset } = data.daily;

		const currentTime = moment.utc(data.current.time);

		const sunriseTime = moment.utc(sunrise[0]);
		const sunsetTime = moment.utc(sunset[0]);

		const timeDiff = is_day
			? sunsetTime.diff(currentTime, 'minutes')
			: sunriseTime.diff(currentTime, 'minutes');

		const remainingTime =
			timeDiff > 60 ? Math.ceil(timeDiff / 60) + ' saat' : timeDiff + ' dakika';

		let msgText =
			`📍 *${match[1]}* için hava durumu\n\n` +
			`🌡️ *Sıcaklık:* ${temperature_2m} °C\n` +
			`${
				precipitation > 0
					? `🌧️ *Yağmur:* ${precipitation} mm\n`
					: `☀️ *Yağmur beklenmiyor*\n`
			}` +
			`${
				is_day
					? `🌇 Ortalama ${remainingTime} *içerisinde güneş batışı*`
					: `🌅 Ortalama ${remainingTime} *içerisinde güneş doğuşu* `
			}`;

		return bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
	} catch (error) {
		console.error(error);
		return bot.sendMessage(
			chatId,
			'⚠️ Bir şeyler yanlış gitti, lütfen tekrar deneyin.'
		);
	}
});
