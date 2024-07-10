import type { SublimitedChannel, SublimitedData } from '#types/SublimitData';

const crosspostBucket = '/channels/:id/messages/:id/crosspost';

const globalRegex = /(?<=(Global\s*:\s*))(true|false)/i;
const bucketRegex = /(?<=(Bucket\s*:\s*))(.+)/i;
const majorParamRegex = /(?<=(Major parameter\s*:\s*))(\d+)/i;
const sublimitRegex = /(?<=(Sublimit\s*:\s*))(\d+)(?=ms)/i;

export const is429 = (response: string) => {
  return response.toLowerCase().includes('429 rate limit');
};

export const parseRestSublimit = (response: string): SublimitedChannel | undefined => {
  if (!response) return;

  const matchValue = (regex: RegExp): string | undefined => {
    const match = response.match(regex);
    if (!match) return;
    return match[0].trim();
  };

  const globalMatch = matchValue(globalRegex);
  const bucketMatch = matchValue(bucketRegex);
  const majorParamMatch = matchValue(majorParamRegex);
  const sublimitMatch = matchValue(sublimitRegex);

  if (!globalMatch || !bucketMatch || !majorParamMatch || !sublimitMatch) return;

  const parsedData: SublimitedData = {
    global: globalMatch === 'true',
    bucket: bucketMatch,
    majorParameter: majorParamMatch,
    sublimit: parseInt(sublimitMatch),
  };

  if (parsedData.global || parsedData.bucket !== crosspostBucket) return;

  return {
    channelId: parsedData.majorParameter,
    sublimit: parsedData.sublimit,
  };
};
