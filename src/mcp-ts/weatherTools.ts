import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type WeatherInfo = {
  condition: string;
  temperature: number;
};

const weatherDataKaltim: Record<string, WeatherInfo> = {
  samarinda: { condition: "cerah", temperature: 32 },
  balikpapan: { condition: "Berawan", temperature: 29 },
  bontang: { condition: "Hujan ringan", temperature: 27 },
  tenggarong: { condition: "Cerah berawan", temperature: 28 },
  sangatta: { condition: "Hujan lebat", temperature: 25 },
};

const kaltimCity: string[] = [
  "samarinda",
  "balikpapan",
  "bontang",
  "tenggarong",
  "sangatta",
];

export class WeatherKaltimTools {
  async getWeatherKaltim(city: string): Promise<CallToolResult> {
    if (!kaltimCity.includes(city.toLowerCase())) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Tidak ada kota ${city} di Wilayah Kaltim.\nKota kaltim:${kaltimCity.join(", ")}`,
          },
        ],
        isError: true,
      };
    } else {
      const dataKaltimInfo = weatherDataKaltim[city.toLowerCase()];
      const resultMcpText: string = `Cuaca di ${city}: ${dataKaltimInfo.condition}, suhu ${dataKaltimInfo.temperature}°C`;

      return {
        content: [
          {
            type: "text",
            text: resultMcpText,
          },
        ],
      };
    }
  }
}
