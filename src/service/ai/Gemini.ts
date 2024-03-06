import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { GEMINI_MODEL } from './enum';

export default class GeminiAi {
  prompts = [];
  genAI: GoogleGenerativeAI;
  model = GEMINI_MODEL.GEMINI_PRO;

  constructor(private readonly configService: ConfigService) {
    const geminiKey = this.configService.get('google.geminiKey');
    console.log(geminiKey);
    this.genAI = new GoogleGenerativeAI(geminiKey);
  }

  async setPrompts(prompts) {
    this.prompts = prompts;
  }
  async setModel(model) {
    this.model = model;
  }
  async simpleCompl(message) {
    const model = this.genAI.getGenerativeModel({ model: this.model });
    const prompts = message.map((p) => p.content);
    const result = await model.generateContent(prompts);
    return result.response.text();
  }
}
