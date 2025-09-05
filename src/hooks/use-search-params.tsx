import {
  useRouter,
  useSearchParams as useNextSearchParams,
} from "next/navigation";

export function useSearchParamsHelper() {
  const router = useRouter();
  const params = useNextSearchParams();

  const removeSearchParam = (paramName: string) => {
    const newParams = new URLSearchParams(params);
    newParams.delete(paramName);
    router.replace(`?${newParams.toString()}`);
  };

  const setSearchParam = (param: string, value: string) => {
    const newParams = new URLSearchParams(params);
    newParams.set(param, value);
    router.replace(`?${newParams.toString()}`);
  };

  return { setSearchParam, removeSearchParam, params };
}
