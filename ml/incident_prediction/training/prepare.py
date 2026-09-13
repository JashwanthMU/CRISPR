import pandas as pd
def main():
    print("Preparing data...")
    df = pd.read_csv("ml/incident_prediction/training/raw_data.csv")
    df.fillna(0, inplace=True)
    df.to_csv("ml/incident_prediction/training/prepared_data.csv", index=False)
    print("Data prepared.")

if __name__ == "__main__":
    main()
