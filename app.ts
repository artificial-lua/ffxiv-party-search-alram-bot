import fs from 'fs';
import { JSDOM } from "jsdom";
import axios from 'axios';

type configType = {
    inven: {
        lastNum: number
        finder: {
            name: string
            keywords: string[]
            webhook: string
        }[]
    }
}

//load config
const config: configType = JSON.parse((fs.readFileSync('.config.json').toString()) || '{}')

const getTextOnly = (element: Element | null): string => {
    if (!element) {
        return "";
    }
    return Array.from(element.childNodes)
        .filter(node => node.nodeType === 3) // 텍스트 노드만 선택
        .map(node => node.textContent?.trim()).join(" ") // 텍스트 값 가져오기
}

const invenURL = 'https://www.inven.co.kr/board/ff14/4482';
let invenLastNum = config.inven.lastNum;

const makeInvenMessage = (
    title: string | null | undefined,
    link: string | null | undefined,
    user: string | null | undefined
): string => {
    return `[인벤] ${user}\n${title}\n${link}`;
}

const getInvenData = () => {
    // 인벤쪽 데이터 읽기
    console.log('getInvenData');
    axios.get(invenURL).then((response) => {
        if (!(response.status >= 200 && response.status < 300)) {
            throw new Error('Failed to fetch data');
        }

        const data = response.data;
        const doc = new JSDOM(data).window.document;

        const table = doc.querySelector('table');
        if (!table) {
            console.error('Failed to find table');
            return
        }

        const resultList: {
            [key: string]: string[]
        } = {}

        for (const finder of config.inven.finder) {
            resultList[finder.name] = [];
        }

        let currentLastNum = invenLastNum;
        const rows = table.querySelectorAll('tbody tr');
        for (const row of rows) {
            const num = parseInt(row.querySelector('td.num')?.textContent?.trim() || '0');
            const state = row.querySelector('.category')?.textContent?.trim();
            const title = getTextOnly(row.querySelector('.subject-link'))?.trim();
            const link = row.querySelector('.subject-link')?.getAttribute('href')
            const user = row.querySelector('.user')?.textContent?.trim()

            if (num <= invenLastNum) {
                continue;
            } else {
                currentLastNum = Math.max(currentLastNum, num);
            }

            if (state === '[완료]') {
                console.log(`[SKIP] [완료] ${title}`);
                continue;
            }

            for (const finder of config.inven.finder) {
                if (finder.keywords.some(keyword => title?.includes(keyword))) {
                    const result = makeInvenMessage(title, link, user)
                    resultList[finder.name].push(result);
                }
            }
        }

        invenLastNum = currentLastNum;

        for (const finder of config.inven.finder) {
            if (resultList[finder.name].length > 0) {
                axios.post(finder.webhook, {
                    content: resultList[finder.name].join('\n')
                }).catch((error) => {
                    console.error(error);
                });
            }
        }
        console.log(`invenLastNum: ${invenLastNum}`);
    });
}

const main = () => {
    setInterval(() => {
        getInvenData()
    }, 60 * 1000);
    getInvenData()
}

main()