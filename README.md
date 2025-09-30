# NavMate

NavMate, OpenStreetMap altyapısıyla hazırlanmış bir Telegram Botudur. Basit bir mesaj ile yol tarifi ve hava durumu hakkında bilgi alabilirsiniz. Yakıt fiyatları internetten çekilmekte olup anlıktır.

## Ekran Görüntüleri

<p align="center">
  <img src="https://github.com/iapheus/navMate-telegram/blob/main/images/img1.PNG" height="300" style="display:inline-block;"/>
  <img src="https://github.com/iapheus/navMate-telegram/blob/main/images/img2.PNG" height="300" style="display:inline-block;"/>
</p>


## Çalıştırmak için

Projeyi kopyalayın

```bash
  git clone https://github.com/iapheus/navMate-telegram.git
```

Proje klasörüne gidin

```bash
  cd navMate-telegram
```

Bağımlılıkları yükleyin

```bash
  npm install
```

Bütün bu adımları yaptıktan sonra, ```.env``` dosyası oluşturun ve içerisine ```TELEGRAM_BOT_TOKEN``` adında bir değişken oluştun.
Bu değişkene Telegram üzerinden oluşturduğunuz bot için size verilen bot tokeni bu değişkene eşitleyin ve serveri çalıştırarak botu kullanmaya başlayabilirsiniz.
