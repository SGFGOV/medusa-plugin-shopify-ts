const job1 = {
  event_name: "test",
  data: {
    id: "test",
  },
};

const StagedJobServiceMock = {
  withTransaction: jest.fn().mockImplementation((data) => {
    return data;
  }),
  create: jest.fn().mockImplementation((data) => {
    return Promise.resolve(data);
  }),

  list: jest.fn().mockImplementation((config) => {
    return Promise.resolve([job1]);
  }),
};

const mock = jest.fn().mockImplementation(() => {
  return StagedJobServiceMock;
});

export default mock;
