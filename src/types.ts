export type SearchEngine = {
  key: string;
  name: string;
  favicon: string;
  searchFunction: (text: string) => void;
};
