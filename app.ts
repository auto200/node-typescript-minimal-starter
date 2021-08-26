import puppeteer, { Browser } from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  await scrapCalsberg(browser);
})();

async function scrapCalsberg(browser: Browser) {
  const BASE_URL = "https://carlsbergpolska.pl";
  const BEER_LIST_URL = `${BASE_URL}/nasze-piwa`;

  const page = await browser.newPage();
  await page.goto(BEER_LIST_URL);
  await page.keyboard.type("99");

  const beerSpecificPageURLS = (await page
    .evaluate(() => {
      const beersContainerSelector =
        ".brands-list__result-records div div .row > div";
      const beers = [
        ...document.querySelectorAll(beersContainerSelector),
      ] as HTMLElement[];
      return beers.map((el) => el.querySelector("a")?.href);
    })
    .then((urls) => urls.filter(Boolean))) as string[];

  scrapCalsbergBeerPage(browser, beerSpecificPageURLS[1]);
}

async function scrapCalsbergBeerPage(browser: Browser, pageUrl: string) {
  const page = await browser.newPage();
  await page.goto(pageUrl);

  const imgSrc = await page.evaluate(() => {
    const imgSelector = ".module--product__image-container.align--center img";
    return (document.querySelector(imgSelector) as HTMLImageElement).currentSrc;
  });

  const infos = await page.evaluate(() => {
    const productInfoSelector = ".module--product__info";

    const name = (
      document.querySelector(`${productInfoSelector} h2`) as HTMLElement
    ).innerText;

    const beerDetailsSelector = `${productInfoSelector} .product-meta.cf`;

    const [type, alcoholByVolume, origin] = (
      [
        ...document.querySelectorAll(`${beerDetailsSelector} dd`),
      ] as HTMLElement[]
    ).map((el) => el.innerText);

    const description = (document.querySelector(
      `${productInfoSelector} p`
    ) as HTMLElement)!.innerText;

    return { name, type, alcoholByVolume, origin, description };
  });

  const nutritionalValues = await page.evaluate(() => {
    const getElementSiblingText = (selector: string): string | undefined =>
      (document.querySelector(selector)?.nextElementSibling as HTMLElement)
        ?.innerText;

    const nutritionalValues = {
      kj: getElementSiblingText("#kJ"),
      kcal: getElementSiblingText("#kcal"),
      carbs: getElementSiblingText("#Carbohydrates"),
      sugars: getElementSiblingText("#Sugars"),
      protein: getElementSiblingText("#Protein"),
      fat: getElementSiblingText("#Fat"),
      saturatedFat: getElementSiblingText("#SaturatedFat"),
      salt: getElementSiblingText("#Salt"),
    };

    return nutritionalValues;
  });

  console.log({ imgSrc, ...infos, nutritionalValues });
}
