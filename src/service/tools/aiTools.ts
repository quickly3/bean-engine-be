import { z } from 'zod';
import { tool } from '@langchain/core/tools';

export const chartTool = tool(
  ({ data }) => {
    console.log(data);
    return 'Chart has been generated and displayed to the user!';
  },
  {
    name: 'generate_bar_chart',
    description:
      'Generates a bar chart from an array of data points using D3.js and displays it for the user.',
    schema: z.object({
      data: z
        .object({
          label: z.string(),
          value: z.number(),
        })
        .array(),
    }),
  },
);
