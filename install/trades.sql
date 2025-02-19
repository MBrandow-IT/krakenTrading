CREATE DATABASE db_CryptoTracker;
USE db_CryptoTracker;
/**********Make sure to change the DB_USER to your own username***********/
CREATE USER ${process.env.DB_USER} FOR LOGIN ${process.env.DB_USER};
ALTER ROLE db_owner ADD MEMBER ${process.env.DB_USER};
/*******You'll need to make this user a db_owner to use the bot in master mode***********/


USE [db_CryptoTracker]
GO

/****** Object:  Table [dbo].[Trades]    Script Date: 2/14/2025 12:06:47 AM ******/
SET ANSI_NULLS ON
GO
	
SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[Trades](
	[ID] [int] IDENTITY(1,1) NOT NULL,
	[Portfolio_ID] [int] NULL,
	[symbol] [nvarchar](255) NULL,
	[type] [nvarchar](255) NULL,
	[status] [nvarchar](255) NULL,
	[entry_price] [decimal](32, 18) NULL,
	[exit_price] [decimal](32, 18) NULL,
	[amount] [decimal](32, 8) NULL,
	[quantity] [decimal](32, 8) NULL,
	[stop_loss] [decimal](32, 8) NULL,
	[take_profit] [decimal](32, 8) NULL,
	[pnl] [decimal](32, 8) NULL,
	[pnl_percentage] [decimal](32, 8) NULL,
	[Reason] [nvarchar](255) NULL,
	[Opened_At] [datetime] NULL,
	[Closed_at] [datetime] NULL,
	[Notes] [nvarchar](max) NULL,
	[coin_id] [nvarchar](255) NULL,
	[peak_price] [decimal](32, 18) NULL,
	[Test_Case] [int] NULL,
	[live] [bit] NULL,
 CONSTRAINT [PK__Trades__3214EC270A555126] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

GO


