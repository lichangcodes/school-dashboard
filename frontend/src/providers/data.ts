import type { HttpError } from "@refinedev/core";
import { createDataProvider, CreateDataProviderOptions } from "@refinedev/rest";

import { CreateResponse, GetOneResponse, ListResponse } from "@/types";
import { BACKEND_BASE_URL } from "@/constants";

const options: CreateDataProviderOptions = {
  getList: {
    getEndpoint: ({ resource }) => resource,

    buildQueryParams: async ({ resource, pagination, filters }) => {
      const params: Record<string, string | number> = {};

      if (pagination?.mode !== "off") {
        const page = pagination?.currentPage ?? 1;
        const pageSize = pagination?.pageSize ?? 10;

        params.page = page;
        params.limit = pageSize;
      }

      filters?.forEach((filter) => {
        const field = "field" in filter ? filter.field : "";
        const value = String(filter.value);

        if (field === "role") {
          params.role = value;
        }

        if (resource === "departments") {
          if (field === "name" || field === "code") params.search = value;
        }

        if (resource === "users") {
          if (field === "search" || field === "name" || field === "email") {
            params.search = value;
          }
        }

        if (resource === "subjects") {
          if (field === "department") params.department = value;
          if (field === "name" || field === "code") params.search = value;
        }

        if (resource === "classes") {
          if (field === "name") params.search = value;
          if (field === "subject") params.subject = value;
          if (field === "teacher") params.teacher = value;
          if (field === "status") params.status = value;
        }
      });

      return params;
    },

    mapResponse: async (response) => {
      const payload: ListResponse = await response.json();
      return payload.data ?? [];
    },

    getTotalCount: async (response) => {
      const payload: ListResponse = await response.json();
      return payload.pagination?.total ?? payload.data?.length ?? 0;
    },
  },

  create: {
    getEndpoint: ({ resource }) => resource,

    buildBodyParams: async ({ variables }) => variables,

    mapResponse: async (response) => {
      const json: CreateResponse = await response.json();
      return json.data ?? {};
    },
  },

  getOne: {
    getEndpoint: ({ resource, id }) => `${resource}/${id}`,

    mapResponse: async (response) => {
      const json: GetOneResponse = await response.json();
      return json.data ?? {};
    },
  },

  // PATCH by default
  update: {
    getEndpoint: ({ resource, id }) => `${resource}/${id}`,

    buildBodyParams: async ({ variables }) => variables,

    mapResponse: async (response) => {
      const json: GetOneResponse = await response.json();
      return json.data ?? {};
    },
  },

  deleteOne: {
    getEndpoint: ({ resource, id }) => `${resource}/${id}`,

    mapResponse: async (response) => {
      const json: GetOneResponse = await response.json();
      return json.data ?? {};
    },
  },
};

const { dataProvider } = createDataProvider(BACKEND_BASE_URL, options, {
  // Send the Better Auth session cookie to the API (it lives on a different origin)
  credentials: "include",
  hooks: {
    afterResponse: [
      // getList/getOne/deleteOne don't check response.ok (deleteOne would report a 409 as
      // success), and create/update put the raw JSON body in the message. Turn every
      // non-2xx into an HttpError with the backend's { error } text; a 401 then reaches
      // authProvider.onError, which logs out.
      async (_request, _options, response) => {
        if (!response.ok) {
          const body = await response.clone().json().catch(() => ({}));
          const error: HttpError = {
            message: body.error ?? response.statusText,
            statusCode: response.status,
          };
          throw error;
        }
      },
    ],
  },
});

export { dataProvider };
