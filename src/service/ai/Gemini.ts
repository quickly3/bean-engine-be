import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

export default class GeminiAi {
  genAI: GoogleGenerativeAI;
  constructor(private readonly configService: ConfigService) {
    const geminiKey = this.configService.get('google.geminiKey');
    console.log(geminiKey);
    this.genAI = new GoogleGenerativeAI(geminiKey);
  }

  async test() {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = '我帅嘛？';

    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  }
}
