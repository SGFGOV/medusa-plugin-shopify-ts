const Logger = {

    info: jest.fn((message: any, optionalParams?: any[]) => {
      console.info(message);
    },
    ),
    error: jest.fn((message: any, optionalParams?: any[]) => {
      console.error(message);
    },
    ),
    warn: jest.fn((message: any, optionalParams?: any[]) => {
      console.warn(message);
    },
    ),
  
  };
  
  export default Logger